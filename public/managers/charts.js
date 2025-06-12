/**
 * Chart Manager class for handling chart creation and updates
 */
import { formatDate } from '../helpers/utils.js';

export class ChartManager {
    constructor(settingsManager) {
        this.charts = new Map();
        this.settingsManager = settingsManager;
        this.formatDate = formatDate;
    }

    /**
     * Creates or updates a chart
     * @param {string} id - The chart ID/canvas element ID
     * @param {Object} config - Chart configuration
     * @param {string} config.type - Chart type (e.g., 'doughnut', 'line')
     * @param {Object} config.data - Chart data
     * @param {Object} config.options - Chart options
     * @returns {Chart} The created/updated chart instance
     */
    createOrUpdateChart(id, config) {
        // Destroy existing chart if it exists
        this.destroyChart(id);

        const canvas = document.getElementById(id);
        if (!canvas) {
            console.error(`Canvas element with id '${id}' not found`);
            return null;
        }

        try {
            const chart = new Chart(canvas, {
                type: config.type,
                data: config.data,
                options: config.options
            });
            this.charts.set(id, chart);
            return chart;
        } catch (error) {
            console.error(`Error creating chart '${id}':`, error);
            return null;
        }
    }

    /**
     * Destroys a specific chart
     * @param {string} id - The chart ID to destroy 
     */
    destroyChart(id) {
        if (this.charts.has(id)) {
            this.charts.get(id).destroy();
            this.charts.delete(id);
        }
    }

    /**
     * Destroys all charts managed by this instance
     */
    destroyAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }

    /**
     * Creates warranty dashboard charts
     * @param {Object} data - The warranty data
     * @param {boolean} animate - Whether to animate the charts
     */
    createWarrantyDashboard(data, animate = true) {
        const { allWarranties, expired, within30, within60, active } = data;

        // Create pie chart
        this.createOrUpdateChart('warrantyPieChart', {
            type: 'doughnut',
            data: {
                labels: ['Expired', 'Expiring in 30 days', 'Expiring in 60 days', 'Active'],
                datasets: [{
                    data: [expired, within30, within60, active],
                    backgroundColor: [
                        '#ef4444', // Red for expired
                        '#f59e0b', // Orange for 60 days
                        '#fbbf24', // Yellow for 30 days
                        '#10b981'  // Green for active
                    ],
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.5)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 10,
                            boxWidth: 10,
                            boxHeight: 10,
                            font: { size: 11 },
                            color: this.getTextColor()
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '65%',
                animation: animate ? { duration: 1000 } : false,
            }
        });

        // Prepare line chart data for warranties
        const now = new Date();
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(now.getMonth() + 6);
        
        const months = [];
        const monthData = new Array(6).fill(0);

        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(now.getMonth() + i);
            months.push(date.toLocaleString('default', { month: 'short' }));
        }

        // Count warranties expiring in each month
        allWarranties.forEach(item => {
            if (!item.warranty?.expirationDate) return;
            
            const expDate = new Date(item.warranty.expirationDate);
            if (isNaN(expDate)) return;
            
            if (expDate >= now && expDate <= sixMonthsLater) {
                const monthDiff = (expDate.getFullYear() - now.getFullYear()) * 12 + expDate.getMonth() - now.getMonth();
                if (monthDiff >= 0 && monthDiff < 6) {
                    monthData[monthDiff]++;
                }
            }
        });

        const maxWarranties = Math.max(...monthData);
        const minWarranties = Math.min(...monthData);
        const stepSize = maxWarranties <= 10 ? 1 : Math.ceil(maxWarranties / 10);

        // Create line chart for warranties
        this.createOrUpdateChart('warrantyLineChart', {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Warranties Expiring',
                    data: monthData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1.2,
                layout: {
                    padding: {
                        top: 2,
                        right: 2,
                        bottom: 2,
                        left: 2
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: minWarranties >= stepSize ? minWarranties - stepSize : 0,
                        max: maxWarranties + stepSize,
                        ticks: {
                            stepSize: stepSize,
                            color: this.getTextColor(),
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(160, 160, 160, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: this.getTextColor(),
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(160, 160, 160, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => `${context[0].label}`,
                            label: (context) => `${context.raw} warranties expiring`
                        }
                    }
                },
                animation: animate ? { duration: 1000 } : false
            }
        });

        // Create maintenance events chart
        this.createMaintenanceChart(months, animate);

        // Set up theme change listener
        this.setupThemeChangeListener();
    }

    /**
     * Creates maintenance events line chart
     * @param {Array} months - Array of month labels for x-axis
     * @param {boolean} animate - Whether to animate the chart
     */
    createMaintenanceChart(months, animate = true) {
        const now = new Date();
        
        // Gather all maintenance events for the next 6 months
        const maintenanceEvents = [];
        if (window.dashboardManager && typeof window.dashboardManager.collectEventsInRange === 'function') {
            // Use the dashboardManager to get all events (assets + sub-assets)
            // We want only maintenance events in the next 6 months
            const allEvents = window.dashboardManager.collectEventsInRange(6, null);
            // console.log('All events collected:', allEvents.length);
            
            allEvents.forEach(ev => {
                if (ev.type === 'maintenance') {
                    maintenanceEvents.push(ev);
                }
            });
            
            // console.log('Maintenance events found:', maintenanceEvents.length, maintenanceEvents);
        } else {
            console.warn('dashboardManager not available or collectEventsInRange method not found');
        }

        // Count maintenance events per month
        const maintenanceMonthData = new Array(6).fill(0);
        maintenanceEvents.forEach(ev => {
            // Ensure ev.date is a Date object
            const eventDate = new Date(this.formatDate(ev.date));
            if (isNaN(eventDate)) {
                console.warn(`Invalid date for event:`, ev);
                return;
            }
            
            // console.log('Processing event:', eventDate, ev.name);
            for (let i = 0; i < 6; i++) {
                const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
                const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59, 999);
                if (eventDate >= start && eventDate <= end) {
                    maintenanceMonthData[i]++;
                    // console.log(`Event on ${ev.date} falls in month ${i} (${months[i]})`);
                    break;
                }
            }
        });

        // get the max / min value in maintenanceMonthData for y-axis step size
        const maxMaintenance = Math.max(...maintenanceMonthData);
        const minMaintenance = Math.min(...maintenanceMonthData);
        const stepSize = maxMaintenance <= 10 ? 1 : Math.ceil(maxMaintenance / 10);

        // console.log('Maintenance chart data:', maintenanceMonthData);

        // Create the maintenance line chart
        this.createOrUpdateChart('maintenanceLineChart', {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Upcoming Maintenance',
                    data: maintenanceMonthData,
                    borderColor: '#10b981', // Green (same as maintenance tag)
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1.2,
                layout: {
                    padding: {
                        top: 2,
                        right: 2,
                        bottom: 2,
                        left: 2
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: minMaintenance >= stepSize ? minMaintenance - stepSize : 0,
                        max: maxMaintenance + stepSize,
                        ticks: {
                            stepSize: stepSize,
                            color: this.getTextColor(),
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(160, 160, 160, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: this.getTextColor(),
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(160, 160, 160, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: (context) => `${context[0].label}`,
                            label: (context) => `${context.raw} maintenance events`
                        }
                    }
                },
                animation: animate ? { duration: 1000 } : false
            }
        });
    }

    /**
     * Updates chart colors based on current theme
     */
    updateChartColors() {
        const textColor = this.getTextColor();

        this.charts.forEach(chart => {
            if (chart.options.plugins.legend?.labels) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            if (chart.options.scales?.x?.ticks) {
                chart.options.scales.x.ticks.color = textColor;
            }
            if (chart.options.scales?.y?.ticks) {
                chart.options.scales.y.ticks.color = textColor;
            }
            chart.update('none');
        });
    }

    /**
     * Gets current text color from CSS variables
     */
    getTextColor() {
        return getComputedStyle(document.documentElement).getPropertyValue('--text-color');
    }

    /**
     * Sets up theme change listener
     */
    setupThemeChangeListener() {
        let timeout = null;
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => this.updateChartColors(), 300);
        });
    }
}
