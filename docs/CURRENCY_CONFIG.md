# Currency Configuration

DumbAssets supports multiple currencies via environment variables. The application uses the standard ISO 4217 currency codes and locale formatting.

## Environment Variables

### `CURRENCY_CODE`
- **Default**: `USD`
- **Description**: The ISO 4217 currency code for price formatting
- **Examples**: `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `JPY`

### `CURRENCY_LOCALE`
- **Default**: `en-US`
- **Description**: The locale for currency formatting (affects number formatting, decimal separators, etc.)
- **Examples**: `en-US`, `en-GB`, `de-DE`, `fr-FR`, `ja-JP`

## Usage Examples

### US Dollar (Default)
```bash
# No configuration needed - this is the default
```

### Euro (Germany)
```bash
export CURRENCY_CODE=EUR
export CURRENCY_LOCALE=de-DE
```

### British Pound
```bash
export CURRENCY_CODE=GBP
export CURRENCY_LOCALE=en-GB
```

### Canadian Dollar
```bash
export CURRENCY_CODE=CAD
export CURRENCY_LOCALE=en-CA
```

### Japanese Yen
```bash
export CURRENCY_CODE=JPY
export CURRENCY_LOCALE=ja-JP
```

## Docker Configuration

### Docker Compose
```yaml
services:
  dumbassets:
    environment:
      - CURRENCY_CODE=EUR
      - CURRENCY_LOCALE=de-DE
```

### Docker Run
```bash
docker run -e CURRENCY_CODE=EUR -e CURRENCY_LOCALE=de-DE dumbassets
```

## Currency Format Examples

Different locales will format the same amount differently:

| Locale | Currency | Amount: 1234.56 | Formatted Output |
|--------|----------|-----------------|------------------|
| en-US  | USD      | 1234.56         | $1,234.56        |
| de-DE  | EUR      | 1234.56         | 1.234,56 €       |
| en-GB  | GBP      | 1234.56         | £1,234.56        |
| fr-FR  | EUR      | 1234.56         | 1 234,56 €       |
| ja-JP  | JPY      | 1234.56         | ¥1,235           |

## Technical Implementation

The currency configuration is:
1. Set via environment variables in `server.js`
2. Injected into the frontend via the dynamic `config.js` endpoint
3. Used by the `formatCurrency()` function in `public/helpers/utils.js`
4. Applied consistently across all currency displays in the application

## Supported Currency Codes

Any valid ISO 4217 currency code is supported. Common examples include:

- **USD** - US Dollar
- **EUR** - Euro  
- **GBP** - British Pound
- **CAD** - Canadian Dollar
- **AUD** - Australian Dollar
- **JPY** - Japanese Yen
- **CHF** - Swiss Franc
- **CNY** - Chinese Yuan
- **INR** - Indian Rupee
- **BRL** - Brazilian Real
- **MXN** - Mexican Peso
- **SEK** - Swedish Krona
- **NOK** - Norwegian Krone
- **DKK** - Danish Krone

For a complete list, refer to the [ISO 4217 standard](https://en.wikipedia.org/wiki/ISO_4217). 