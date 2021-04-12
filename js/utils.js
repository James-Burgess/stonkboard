
function symbolUrl(symbol) {
    return `https://finance.yahoo.com/quote/${symbol.replace('.', '-')}`;
}

function formatQuote(value) {
    let options = {
        'minimumFractionDigits': 2,
        'style': 'decimal'
    };
    return value.toLocaleString('en', options);
}

function formatMarketCap(marketCap) {
    let value, suffix;
    if (marketCap >= 1e12) {
        value = marketCap / 1e12;
        suffix = 'T';
    } else if (marketCap >= 1e9) {
        value = marketCap / 1e9;
        suffix = 'B';
    } else {
        value = marketCap / 1e6;
        suffix = 'M';
    }

    let digits = value < 10 ? 2 : 1;

    return '$' + value.toFixed(digits) + suffix;
}