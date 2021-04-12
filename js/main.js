'use strict';

const REFRESH_SECONDS = 100;
const BASE_URL = 'https://cloud.iexapis.com/stable/stock/market/batch';
let API_KEY = undefined

function setup(settings) {
    API_KEY = settings.key
    let portfolios = settings.portfolio
    portfolios.map(portfolio => addPortfolio(portfolio))
    deletePortfolios(portfolios.map(p => p.name))
    drawPortfolios()
    setInterval(updateData , REFRESH_SECONDS * 1000);
}

function addPortfolio(portfolio) {
    let portfolios = JSON.parse(localStorage.getItem('portfolios') || '{}')

    if (!portfolios[portfolio.name]) {
        portfolios[portfolio.name] = {}
    }
    let newPortfolio = {}
    Object.keys(portfolio.symbols).map((sym) => {
        newPortfolio[sym] = portfolios[portfolio.name][sym] || {'hist': [], ...portfolio.symbols[sym]} // TODO: select specific settings to updte
    })
    portfolios[portfolio.name] = newPortfolio
    localStorage.setItem('portfolios', JSON.stringify(portfolios))
}

function deletePortfolios(valid_names) {
    let portfolios = JSON.parse(localStorage.getItem('portfolios'))

    const toDel = Object.keys(portfolios).filter((item) => !valid_names.includes(item))
    toDel.map(key => delete portfolios[key])

    localStorage.setItem('portfolios', JSON.stringify(portfolios))
}

function drawPortfolios() {
    let portfolios = JSON.parse(localStorage.getItem('portfolios'))
    Object.keys(portfolios).map((name) => drawPortfolio(name, portfolios[name]))
    updateData()
}

function drawPortfolio(name, symbols) {
    let bodyHtml = Object.keys(symbols).map((symbol) => {
        symbol = symbol.toUpperCase();

        let html = `           
             <div class="column is-one-quarter" >
                <div class="card" data-symbol="${symbol}">
                  <div class="card-content">
                    <div class="media">
                      <div class="media-left">
                        <figure class="image is-48x48">
                          <img src="https://bulma.io/images/placeholders/96x96.png" alt="Placeholder image">
                        </figure>
                      </div>
                      <div class="media-content">
                        <p class="title is-4 company-name">Tesla</p>
                        <p class="subtitle is-6">
                        <a href="${symbolUrl(symbol)}" target="_blank">${symbol}</a>
                          <small class="stock-mkt-cap">$3.5B</small>
                        </p>
        
                      </div>
                    </div>
        
                    <div class="content">
                      <table>
                        <tbody>
                        <tr>
                          <td>Price</td>
                          <td class="stock-price" >Four</td>
                        </tr>
                        <tr>
                          <td>Day Delta</td>
                          <td class="stock-change">Six</td>
                        </tr>
                        <tr>
                          <td>Portfolio Value</td>
                          <td class="stock-value">Eight</td>
                        </tr>
                         <tr>
                          <td>Delta</td>
                          <td class="value-change">Eight</td>
                        </tr>
                        </tbody>
                      </table>
                      
                      <progress class="progress is-info" value="15" max="100">15%</progress>
        
                    </div>
                  </div>
                </div>
        
              </div>
        `;
        return html;
    }).join('');

    let portfolioDiv = document.createElement('div');
    portfolioDiv.classList.add('portfolio-container');

    portfolioDiv.innerHTML = `
            <div class="container">
              <div class="notification is-primary">
                  <div class="columns">
                  <div class="column">
                    <h1 class="portfolio-name">${name}</h1>
    
                  </div>
                  <div class="column is-half">
                    <span id="${name}-value">$</span>
                  </div>
                  <div class="column is-2 is-offset-1 ">
                  <div class="columns">
                  <div class="column is-one-third">Live</div>
                  <div class="column">
                  <div class="control">
                      <label class="switch">
                      <input type="checkbox" id="${name}-switch" checked onChange="updateData()">
                      <span class="slider"></span>
                    </label>
                    </div>
                </div>
                  <div class="column">Portfolio</div>
                </div>
                  
                    </div>
                  </div>
              </div>
              <div class="columns is-multiline" data-columns>${bodyHtml}</div>

            </div>
              <div class="block"> .</div>

        `;

    document.querySelector('.container').appendChild(portfolioDiv);
}

async function updateData() {
    let portfolios = JSON.parse(localStorage.getItem('portfolios'))
    await Promise.all(Object.keys(portfolios).map((name) => getNewStats(portfolios[name])))

    localStorage.setItem('portfolios', JSON.stringify(portfolios))
    Object.keys(portfolios).map((name) => drawUpdatedPortfolio(portfolios[name], name))

    // document.querySelector('.updated-timestamp').innerHTML = `Updated ${(new Date()).toLocaleString()}`;
}

async function getNewStats(portfolio) {
    let symbols = Object.keys(portfolio)
    let filters = ['latestPrice', 'change', 'changePercent', 'marketCap', 'ytdChange', 'companyName', 'week52High', 'week52Low'];
    let url = `${BASE_URL}?token=${API_KEY}&types=quote&symbols=${symbols.join(',')}&filter=${filters.join(',')}`;

    return fetch(url)
        .then(response => response.json())
        .then(json => {
            symbols.forEach(symbol => {
                let data = json[symbol];
                if (typeof (data) === 'undefined') return;
                const {share, buy} = portfolio[symbol]

                portfolio[symbol]['formattedPrice'] = formatQuote(data.quote.latestPrice);
                portfolio[symbol]['formattedChange'] = data.quote.change.toLocaleString('en', {'minimumFractionDigits': 2});
                portfolio[symbol]['changePercent'] = data.quote.changePercent;
                portfolio[symbol]['formattedChangePercentYr'] = (data.quote.ytdChange * 100).toFixed(2) + '%';
                portfolio[symbol]['formattedValue'] = (share * data.quote.latestPrice).toFixed(2);
                portfolio[symbol]['formattedMarketCap'] = formatMarketCap(data.quote.marketCap);
                portfolio[symbol]['companyName'] = data.quote.companyName
                portfolio[symbol]['week52High'] = data.quote.week52High
                portfolio[symbol]['week52Low'] = data.quote.week52Low
                portfolio[symbol]['price'] = data.quote.latestPrice
                portfolio[symbol]['total'] = share * data.quote.latestPrice
                portfolio[symbol]['hist'].push(data.quote.latestPrice)
                portfolio[symbol]['share'] = share
                portfolio[symbol]['buy'] = buy
            });
        })
}

function drawUpdatedPortfolio(portfolio, name) {
    let tally = 0
    let buyTally = 0

    Object.keys(portfolio).map((symbol) => {
        const { formattedPrice, formattedChange, changePercent, formattedValue, formattedMarketCap, total, companyName, week52Low, week52High, price, buy } = portfolio[symbol]

        tally += total
        buyTally += buy

        const liveView = document.getElementById(name + '-switch').checked

        let portfolioChange = (((formattedValue / buy) * 100 ) - 100).toFixed(2)

        let colorVal = liveView ? portfolioChange : changePercent

        let rgbColor = colorVal > 0 ? '0,255,0' : '255,0,0';
        let rgbOpacity = Math.min(Math.abs(colorVal) * (liveView ? .1 : 20), 1);


        let formattedChangePercent = (changePercent * 100).toFixed(2) + '%';

        document.querySelectorAll(`[data-symbol="${symbol}"] .stock-price`).forEach(e => {
            e.innerHTML = `${formattedPrice}`;
        });

        document.querySelectorAll(`[data-symbol="${symbol}"] .stock-change`).forEach(e => {
            e.innerHTML = `${formattedChange} (${formattedChangePercent})`;
        });


        document.querySelectorAll(`[data-symbol="${symbol}"] .stock-value`).forEach(e => {
            e.innerHTML = `$${formattedValue}`;
        });

        document.querySelectorAll(`[data-symbol="${symbol}"] .value-change`).forEach(e => {
            e.innerHTML = `${(formattedValue - buy).toFixed(2)} (${portfolioChange}%)`;
        });


        document.querySelectorAll(`[data-symbol="${symbol}"] .stock-mkt-cap`).forEach(e => {
            e.innerHTML = `${formattedMarketCap}`;
        });

        document.querySelectorAll(`[data-symbol="${symbol}"] .company-name`).forEach(e => {
            e.innerHTML = `${companyName.length > 18 ? companyName.slice(0, 14) + '..' : companyName}`;
        });

        document.querySelectorAll(`[data-symbol="${symbol}"] .progress`).forEach(e => {
            e.value = price
            e.min = week52Low
            e.max = week52High
        });

        document.querySelectorAll(`[data-symbol="${symbol}"] .card-content`).forEach(e => {
            e.setAttribute('style', `background-color: rgba(${rgbColor}, ${rgbOpacity})`);
        });

    })

    document.getElementById(name + '-value').innerHTML = `$${tally.toFixed(2)} ${(tally - buyTally).toFixed(2)}   (${(((tally/buyTally)*100) - 100).toFixed(2)}%)`

}
