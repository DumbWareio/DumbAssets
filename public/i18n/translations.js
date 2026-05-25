/**
 * DumbAssets - Internationalization (i18n) Translations
 * Supports: English (en), Italian (it)
 */

const TRANSLATIONS = {
    en: {
        // General
        'app.title': 'DumbAssets',
        'app.save': 'Save',
        'app.cancel': 'Cancel',
        'app.delete': 'Delete',
        'app.edit': 'Edit',
        'app.add': 'Add',
        'app.close': 'Close',
        'app.yes': 'Yes',
        'app.no': 'No',
        'app.loading': 'Loading...',
        'app.na': 'N/A',
        'app.builtBy': 'Built by',

        // Login
        'login.enterPin': 'Enter PIN',
        'login.incorrectPin': 'Incorrect PIN. Please try again.',
        'login.selectUser': 'Select User',
        'login.chooseUser': 'Choose User',
        'login.enterPinFor': 'Enter PIN for',
        'login.back': '← Back',
        'login.attemptsLeft': 'attempts remaining',
        'login.attemptsRemaining': 'attempts remaining.',
        'login.lastAttempt': 'Incorrect PIN. Last attempt before lockout.',
        'login.error': 'An error occurred. Please try again.',

        // Sidebar
        'sidebar.search': 'Search assets...',
        'sidebar.clearFilters': 'Clear all filters',
        'sidebar.noAssets': 'No assets found. Add your first asset to get started.',
        'sidebar.addAsset': 'Add Asset',

        // Asset list item
        'asset.warrantyExpired': 'Warranty Expired',
        'asset.warrantyLifetime': 'Lifetime Warranty',
        'asset.warrantyDays': 'days left',

        // Asset details
        'asset.details.manufacturer': 'Manufacturer',
        'asset.details.modelNumber': 'Model Number',
        'asset.details.serialNumber': 'Serial Number',
        'asset.details.purchaseDate': 'Purchase Date',
        'asset.details.price': 'Price',
        'asset.details.quantity': 'Quantity',
        'asset.details.totalValue': 'Total Value',
        'asset.details.warranty': 'Warranty',
        'asset.details.warrantyExpiration': 'Warranty Expiration',
        'asset.details.warrantyLifetime': 'Lifetime',
        'asset.details.secondaryWarranty': 'Secondary Warranty',
        'asset.details.link': 'Link',
        'asset.details.tags': 'Tags',
        'asset.details.notes': 'Notes',
        'asset.details.maintenance': 'Maintenance',
        'asset.details.photo': 'Photo',
        'asset.details.receipt': 'Receipt',
        'asset.details.manual': 'Manual',
        'asset.details.location': 'Location',
        'asset.details.createdAt': 'Added',
        'asset.details.updatedAt': 'Updated',

        // Asset modal
        'modal.asset.addTitle': 'Add Asset',
        'modal.asset.editTitle': 'Edit Asset',
        'modal.asset.name': 'Name *',
        'modal.asset.manufacturer': 'Manufacturer',
        'modal.asset.modelNumber': 'Model Number',
        'modal.asset.serialNumber': 'Serial Number',
        'modal.asset.purchaseDate': 'Purchase Date',
        'modal.asset.price': 'Price',
        'modal.asset.quantity': 'Quantity',
        'modal.asset.warrantyScope': 'Warranty Scope',
        'modal.asset.warrantyExpiration': 'Warranty Expiration',
        'modal.asset.warrantyLifetime': 'Lifetime',
        'modal.asset.addSecondaryWarranty': 'Warranty',
        'modal.asset.secondaryWarrantyScope': 'Secondary Warranty Scope',
        'modal.asset.secondaryWarrantyExpiration': 'Secondary Warranty Expiration',
        'modal.asset.link': 'Link',
        'modal.asset.tags': 'Tags',
        'modal.asset.tagsPlaceholder': 'Add tags (press enter or comma to add)',
        'modal.asset.notes': 'Notes',
        'modal.asset.maintenanceEvents': 'Maintenance Events',
        'modal.asset.addMaintenanceEvent': 'Add Maintenance Event',
        'modal.asset.fileAttachments': 'File Attachments',
        'modal.asset.photo': 'Photo',
        'modal.asset.receipt': 'Receipt',
        'modal.asset.manual': 'Manual',
        'modal.asset.uploadPhoto': 'Drag & drop or click to upload photos',
        'modal.asset.uploadReceipt': 'Drag & drop or click to upload receipts',
        'modal.asset.uploadManual': 'Drag & drop or click to upload manuals',

        // Component (sub-asset) modal
        'modal.component.addTitle': 'Add Component',
        'modal.component.editTitle': 'Edit Component',
        'modal.component.name': 'Name*',
        'modal.component.manufacturer': 'Manufacturer',
        'modal.component.modelNumber': 'Model Number',
        'modal.component.serialNumber': 'Serial Number',
        'modal.component.purchaseDate': 'Purchase Date',
        'modal.component.price': 'Price',
        'modal.component.quantity': 'Quantity',
        'modal.component.warrantyScope': 'Warranty Scope',
        'modal.component.warrantyExpiration': 'Warranty Expiration',
        'modal.component.warrantyLifetime': 'Lifetime',
        'modal.component.link': 'Link',
        'modal.component.tags': 'Tags',
        'modal.component.tagsPlaceholder': 'Add tags (press enter or comma to add)',
        'modal.component.notes': 'Notes',
        'modal.component.maintenanceEvents': 'Maintenance Events',
        'modal.component.addMaintenanceEvent': 'Add Maintenance Event',
        'modal.component.fileAttachments': 'File Attachments',
        'modal.component.photo': 'Photo',
        'modal.component.receipt': 'Receipt',
        'modal.component.manual': 'Manual',
        'modal.component.uploadPhoto': 'Drag & drop or click to upload photos',
        'modal.component.uploadReceipt': 'Drag & drop or click to upload receipts',
        'modal.component.uploadManual': 'Drag & drop or click to upload manuals',

        // Components panel
        'components.title': 'Components',
        'components.addBtn': '+ Add Component',

        // Settings modal
        'settings.title': 'Settings',
        'settings.tab.notifications': 'Notifications',
        'settings.tab.interface': 'Interface',
        'settings.tab.system': 'System',
        'settings.tab.language': 'Language',
        'settings.save': 'Save',
        'settings.cancel': 'Cancel',
        'settings.test': 'Test',

        // Notification settings
        'settings.notifications.title': 'Warranty Notifications',
        'settings.notifications.hint': 'Configure when to receive warranty expiration alerts:',
        'settings.notifications.add': 'On Add',
        'settings.notifications.delete': 'On Delete',
        'settings.notifications.edit': 'On Edit',
        'settings.notifications.1month': '1 Month',
        'settings.notifications.2weeks': '2 Weeks',
        'settings.notifications.1week': '1 Week',
        'settings.notifications.3days': '3 Days',
        'settings.notifications.maintenance': 'Maintenance',
        'settings.notifications.appriseUrl': 'Apprise URL',
        'settings.notifications.appriseUrlHint': 'Enter an Apprise-compatible notification URL',

        // Interface settings
        'settings.interface.reorderTitle': 'Reorder Sections',
        'settings.interface.reorderHint': 'Drag and drop to reorder dashboard sections:',
        'settings.interface.toggleTitle': 'Toggle Sections',
        'settings.interface.toggleCardsTitle': 'Toggle Cards',
        'settings.interface.showAnalytics': 'Show Analytics',
        'settings.interface.showTotals': 'Show Totals',
        'settings.interface.showWarranties': 'Show Warranties',
        'settings.interface.showEvents': 'Show Events',
        'settings.interface.totalAssets': 'Total Assets',
        'settings.interface.totalComponents': 'Total Components',
        'settings.interface.totalValue': 'Total Value',
        'settings.interface.warrantiesTotal': 'Warranties Total',
        'settings.interface.warrantiesIn60': 'Warranties In 60',
        'settings.interface.warrantiesIn30': 'Warranties In 30',
        'settings.interface.warrantiesExpired': 'Warranties Expired',
        'settings.interface.warrantiesActive': 'Warranties Active',

        // Dashboard sections
        'dashboard.section.analytics': 'Analytics',
        'dashboard.section.totals': 'Totals',
        'dashboard.section.warranties': 'Warranties',
        'dashboard.section.events': 'Events',

        // System settings
        'settings.system.dataExport': 'Data Export',
        'settings.system.exportAllCsv': 'Export All Data CSV',
        'settings.system.exportSimpleCsv': 'Export Simple CSV',

        // Language settings
        'settings.language.title': 'Language / Lingua',
        'settings.language.hint': 'Select your preferred language:',
        'settings.language.en': 'English',
        'settings.language.it': 'Italiano',

        // Toast messages
        'toast.assetAdded': 'Asset added successfully!',
        'toast.assetUpdated': 'Asset updated successfully!',
        'toast.assetDeleted': 'Asset deleted',
        'toast.componentAdded': 'Component added successfully!',
        'toast.componentUpdated': 'Component updated successfully!',
        'toast.componentDeleted': 'Component deleted',
        'toast.settingsSaved': 'Settings saved',
        'toast.notificationSent': 'Test notifications sent successfully!',
        'toast.exportedSimple': 'Simple data exported successfully!',
        'toast.exportedAll': 'All data exported successfully!',

        // Confirm dialogs
        'confirm.deleteAsset': 'Are you sure you want to delete this asset?',
        'confirm.deleteComponent': 'Are you sure you want to delete this component?',

        // Dashboard
        'dashboard.totalAssets': 'Total Assets',
        'dashboard.totalComponents': 'Total Components',
        'dashboard.totalValue': 'Total Value',
        'dashboard.warrantiesExpiring': 'Warranties Expiring',
        'dashboard.warrantyExpired': 'Expired',
        'dashboard.warrantyActive': 'Active',
        'dashboard.warrantyIn30': 'Within 30 Days',
        'dashboard.warrantyIn60': 'Within 60 Days',
        'dashboard.noWarranties': 'No warranty expirations',
        'dashboard.noEvents': 'No upcoming maintenance events',

        // Maintenance
        'maintenance.recurring': 'Recurring',
        'maintenance.oneTime': 'One-time',
        'maintenance.every': 'Every',
        'maintenance.nextDue': 'Next',
        'maintenance.name': 'Event Name',
        'maintenance.type': 'Type',
        'maintenance.frequency': 'Frequency',
        'maintenance.date': 'Date',
        'maintenance.notes': 'Notes',

        // User info
        'user.loggedInAs': 'Logged in as',
        'user.logout': 'Logout',
    },

    it: {
        // Generale
        'app.title': 'DumbAssets',
        'app.save': 'Salva',
        'app.cancel': 'Annulla',
        'app.delete': 'Elimina',
        'app.edit': 'Modifica',
        'app.add': 'Aggiungi',
        'app.close': 'Chiudi',
        'app.yes': 'Sì',
        'app.no': 'No',
        'app.loading': 'Caricamento...',
        'app.na': 'N/D',
        'app.builtBy': 'Creato da',

        // Login
        'login.enterPin': 'Inserisci PIN',
        'login.incorrectPin': 'PIN errato. Riprova.',
        'login.selectUser': 'Seleziona Utente',
        'login.chooseUser': 'Scegli Utente',
        'login.enterPinFor': 'Inserisci PIN per',
        'login.back': '← Indietro',
        'login.attemptsLeft': 'tentativi rimanenti',
        'login.attemptsRemaining': 'tentativi rimanenti.',
        'login.lastAttempt': 'PIN errato. Ultimo tentativo prima del blocco.',
        'login.error': 'Si è verificato un errore. Riprova.',

        // Barra laterale
        'sidebar.search': 'Cerca beni...',
        'sidebar.clearFilters': 'Cancella tutti i filtri',
        'sidebar.noAssets': 'Nessun bene trovato. Aggiungi il tuo primo bene per iniziare.',
        'sidebar.addAsset': 'Aggiungi Bene',

        // Voce elenco beni
        'asset.warrantyExpired': 'Garanzia scaduta',
        'asset.warrantyLifetime': 'Garanzia a vita',
        'asset.warrantyDays': 'giorni rimanenti',

        // Dettagli bene
        'asset.details.manufacturer': 'Produttore',
        'asset.details.modelNumber': 'Numero Modello',
        'asset.details.serialNumber': 'Numero Seriale',
        'asset.details.purchaseDate': 'Data Acquisto',
        'asset.details.price': 'Prezzo',
        'asset.details.quantity': 'Quantità',
        'asset.details.totalValue': 'Valore Totale',
        'asset.details.warranty': 'Garanzia',
        'asset.details.warrantyExpiration': 'Scadenza Garanzia',
        'asset.details.warrantyLifetime': 'A vita',
        'asset.details.secondaryWarranty': 'Garanzia Secondaria',
        'asset.details.link': 'Collegamento',
        'asset.details.tags': 'Tag',
        'asset.details.notes': 'Note',
        'asset.details.maintenance': 'Manutenzione',
        'asset.details.photo': 'Foto',
        'asset.details.receipt': 'Scontrino',
        'asset.details.manual': 'Manuale',
        'asset.details.location': 'Posizione',
        'asset.details.createdAt': 'Aggiunto',
        'asset.details.updatedAt': 'Aggiornato',

        // Modale bene
        'modal.asset.addTitle': 'Aggiungi Bene',
        'modal.asset.editTitle': 'Modifica Bene',
        'modal.asset.name': 'Nome *',
        'modal.asset.manufacturer': 'Produttore',
        'modal.asset.modelNumber': 'Numero Modello',
        'modal.asset.serialNumber': 'Numero Seriale',
        'modal.asset.purchaseDate': 'Data Acquisto',
        'modal.asset.price': 'Prezzo',
        'modal.asset.quantity': 'Quantità',
        'modal.asset.warrantyScope': 'Ambito Garanzia',
        'modal.asset.warrantyExpiration': 'Scadenza Garanzia',
        'modal.asset.warrantyLifetime': 'A vita',
        'modal.asset.addSecondaryWarranty': 'Garanzia',
        'modal.asset.secondaryWarrantyScope': 'Ambito Garanzia Secondaria',
        'modal.asset.secondaryWarrantyExpiration': 'Scadenza Garanzia Secondaria',
        'modal.asset.link': 'Collegamento',
        'modal.asset.tags': 'Tag',
        'modal.asset.tagsPlaceholder': 'Aggiungi tag (premi invio o virgola per aggiungere)',
        'modal.asset.notes': 'Note',
        'modal.asset.maintenanceEvents': 'Eventi di Manutenzione',
        'modal.asset.addMaintenanceEvent': 'Aggiungi Evento Manutenzione',
        'modal.asset.fileAttachments': 'Allegati File',
        'modal.asset.photo': 'Foto',
        'modal.asset.receipt': 'Scontrino',
        'modal.asset.manual': 'Manuale',
        'modal.asset.uploadPhoto': 'Trascina o clicca per caricare foto',
        'modal.asset.uploadReceipt': 'Trascina o clicca per caricare scontrini',
        'modal.asset.uploadManual': 'Trascina o clicca per caricare manuali',

        // Modale componente
        'modal.component.addTitle': 'Aggiungi Componente',
        'modal.component.editTitle': 'Modifica Componente',
        'modal.component.name': 'Nome*',
        'modal.component.manufacturer': 'Produttore',
        'modal.component.modelNumber': 'Numero Modello',
        'modal.component.serialNumber': 'Numero Seriale',
        'modal.component.purchaseDate': 'Data Acquisto',
        'modal.component.price': 'Prezzo',
        'modal.component.quantity': 'Quantità',
        'modal.component.warrantyScope': 'Ambito Garanzia',
        'modal.component.warrantyExpiration': 'Scadenza Garanzia',
        'modal.component.warrantyLifetime': 'A vita',
        'modal.component.link': 'Collegamento',
        'modal.component.tags': 'Tag',
        'modal.component.tagsPlaceholder': 'Aggiungi tag (premi invio o virgola per aggiungere)',
        'modal.component.notes': 'Note',
        'modal.component.maintenanceEvents': 'Eventi di Manutenzione',
        'modal.component.addMaintenanceEvent': 'Aggiungi Evento Manutenzione',
        'modal.component.fileAttachments': 'Allegati File',
        'modal.component.photo': 'Foto',
        'modal.component.receipt': 'Scontrino',
        'modal.component.manual': 'Manuale',
        'modal.component.uploadPhoto': 'Trascina o clicca per caricare foto',
        'modal.component.uploadReceipt': 'Trascina o clicca per caricare scontrini',
        'modal.component.uploadManual': 'Trascina o clicca per caricare manuali',

        // Pannello componenti
        'components.title': 'Componenti',
        'components.addBtn': '+ Aggiungi Componente',

        // Modale impostazioni
        'settings.title': 'Impostazioni',
        'settings.tab.notifications': 'Notifiche',
        'settings.tab.interface': 'Interfaccia',
        'settings.tab.system': 'Sistema',
        'settings.tab.language': 'Lingua',
        'settings.save': 'Salva',
        'settings.cancel': 'Annulla',
        'settings.test': 'Test',

        // Impostazioni notifiche
        'settings.notifications.title': 'Notifiche Garanzia',
        'settings.notifications.hint': 'Configura quando ricevere avvisi di scadenza garanzia:',
        'settings.notifications.add': 'All\'aggiunta',
        'settings.notifications.delete': 'All\'eliminazione',
        'settings.notifications.edit': 'Alla modifica',
        'settings.notifications.1month': '1 Mese',
        'settings.notifications.2weeks': '2 Settimane',
        'settings.notifications.1week': '1 Settimana',
        'settings.notifications.3days': '3 Giorni',
        'settings.notifications.maintenance': 'Manutenzione',
        'settings.notifications.appriseUrl': 'URL Apprise',
        'settings.notifications.appriseUrlHint': 'Inserisci un URL compatibile con Apprise',

        // Impostazioni interfaccia
        'settings.interface.reorderTitle': 'Riordina Sezioni',
        'settings.interface.reorderHint': 'Trascina e rilascia per riordinare le sezioni del cruscotto:',
        'settings.interface.toggleTitle': 'Attiva/Disattiva Sezioni',
        'settings.interface.toggleCardsTitle': 'Attiva/Disattiva Schede',
        'settings.interface.showAnalytics': 'Mostra Analisi',
        'settings.interface.showTotals': 'Mostra Totali',
        'settings.interface.showWarranties': 'Mostra Garanzie',
        'settings.interface.showEvents': 'Mostra Eventi',
        'settings.interface.totalAssets': 'Totale Beni',
        'settings.interface.totalComponents': 'Totale Componenti',
        'settings.interface.totalValue': 'Valore Totale',
        'settings.interface.warrantiesTotal': 'Totale Garanzie',
        'settings.interface.warrantiesIn60': 'Garanzie entro 60 giorni',
        'settings.interface.warrantiesIn30': 'Garanzie entro 30 giorni',
        'settings.interface.warrantiesExpired': 'Garanzie Scadute',
        'settings.interface.warrantiesActive': 'Garanzie Attive',

        // Sezioni cruscotto
        'dashboard.section.analytics': 'Analisi',
        'dashboard.section.totals': 'Totali',
        'dashboard.section.warranties': 'Garanzie',
        'dashboard.section.events': 'Eventi',

        // Impostazioni sistema
        'settings.system.dataExport': 'Esportazione Dati',
        'settings.system.exportAllCsv': 'Esporta Tutti i Dati CSV',
        'settings.system.exportSimpleCsv': 'Esporta CSV Semplice',

        // Impostazioni lingua
        'settings.language.title': 'Language / Lingua',
        'settings.language.hint': 'Seleziona la tua lingua preferita:',
        'settings.language.en': 'English',
        'settings.language.it': 'Italiano',

        // Messaggi toast
        'toast.assetAdded': 'Bene aggiunto con successo!',
        'toast.assetUpdated': 'Bene aggiornato con successo!',
        'toast.assetDeleted': 'Bene eliminato',
        'toast.componentAdded': 'Componente aggiunto con successo!',
        'toast.componentUpdated': 'Componente aggiornato con successo!',
        'toast.componentDeleted': 'Componente eliminato',
        'toast.settingsSaved': 'Impostazioni salvate',
        'toast.notificationSent': 'Notifiche di test inviate con successo!',
        'toast.exportedSimple': 'Dati semplici esportati con successo!',
        'toast.exportedAll': 'Tutti i dati esportati con successo!',

        // Dialoghi di conferma
        'confirm.deleteAsset': 'Sei sicuro di voler eliminare questo bene?',
        'confirm.deleteComponent': 'Sei sicuro di voler eliminare questo componente?',

        // Cruscotto
        'dashboard.totalAssets': 'Totale Beni',
        'dashboard.totalComponents': 'Totale Componenti',
        'dashboard.totalValue': 'Valore Totale',
        'dashboard.warrantiesExpiring': 'Garanzie in Scadenza',
        'dashboard.warrantyExpired': 'Scadute',
        'dashboard.warrantyActive': 'Attive',
        'dashboard.warrantyIn30': 'Entro 30 Giorni',
        'dashboard.warrantyIn60': 'Entro 60 Giorni',
        'dashboard.noWarranties': 'Nessuna scadenza di garanzia',
        'dashboard.noEvents': 'Nessun evento di manutenzione imminente',

        // Manutenzione
        'maintenance.recurring': 'Ricorrente',
        'maintenance.oneTime': 'Una tantum',
        'maintenance.every': 'Ogni',
        'maintenance.nextDue': 'Prossimo',
        'maintenance.name': 'Nome Evento',
        'maintenance.type': 'Tipo',
        'maintenance.frequency': 'Frequenza',
        'maintenance.date': 'Data',
        'maintenance.notes': 'Note',

        // Info utente
        'user.loggedInAs': 'Connesso come',
        'user.logout': 'Esci',
    }
};

/**
 * i18n - Internationalization module
 */
(function() {
    const LANG_KEY = 'dumbAssets_language';

    function detectLanguage() {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved && TRANSLATIONS[saved]) return saved;
        const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase().split('-')[0];
        return TRANSLATIONS[browserLang] ? browserLang : 'en';
    }

    let currentLang = detectLanguage();

    function t(key, fallback) {
        const lang = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];
        if (lang[key] !== undefined) return lang[key];
        if (TRANSLATIONS['en'][key] !== undefined) return TRANSLATIONS['en'][key];
        return fallback !== undefined ? fallback : key;
    }

    function setLanguage(lang) {
        if (!TRANSLATIONS[lang]) return;
        currentLang = lang;
        localStorage.setItem(LANG_KEY, lang);
        applyTranslations();
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    function getLanguage() {
        return currentLang;
    }

    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = t(key);
            if (translation) el.textContent = translation;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation) el.placeholder = translation;
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = t(key);
            if (translation) el.title = translation;
        });
    }

    document.addEventListener('DOMContentLoaded', applyTranslations);

    window.i18n = { t, setLanguage, getLanguage, applyTranslations, TRANSLATIONS };
    window.t = t;
})();
