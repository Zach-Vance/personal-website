document.addEventListener('DOMContentLoaded', function() {
    const tickersElement = document.getElementById('tickers');

    const companies = [
        {'name': 'Walmart', 'ticker': 'WMT', 'revenue': 611289000000, 'annualProfit': 11680000000, 'domain': 'walmart.com'}, 
        {'name': 'Amazon.com', 'ticker': 'AMZN', 'revenue': 513983000000, 'annualProfit': -2722000000, 'domain': 'amazon.com'}, 
        {'name': 'Exxon Mobil', 'ticker': 'XOM', 'revenue': 413680000000, 'annualProfit': 55740000000, 'domain': 'corporate.exxonmobil.com'},
        {'name': 'Apple', 'ticker': 'AAPL', 'revenue': 394328000000, 'annualProfit': 99803000000, 'domain': 'apple.com'}, 
        {'name': 'UnitedHealth Group', 'ticker': 'UNH', 'revenue': 324162000000, 'annualProfit': 20120000000, 'domain': 'unitedhealthgroup.com'},
        {'name': 'CVS Health', 'ticker': 'CVS', 'revenue': 322467000000, 'annualProfit': 4149000000, 'domain': 'cvshealth.com'}, 
        {'name': 'Berkshire Hathaway', 'ticker': 'BRKA', 'revenue': 302089000000, 'annualProfit': -22819000000, 'domain': 'berkshirehathaway.com'}, 
        {'name': 'Alphabet', 'ticker': 'GOOGL', 'revenue': 282836000000, 'annualProfit': 59972000000, 'domain': 'google.com'}, 
        {'name': 'McKesson', 'ticker': 'MCK', 'revenue': 263966000000, 'annualProfit': 1114000000, 'domain': 'mckesson.com'}, 
        {'name': 'Chevron', 'ticker': 'CVX', 'revenue': 246252000000, 'annualProfit': 35465000000, 'domain': 'chevron.com'}, 
        {'name': 'AmerisourceBergen', 'ticker': 'ABC', 'revenue': 238587000000, 'annualProfit': 1699000000, 'domain': 'amerisourcebergen.com'}, 
        {'name': 'Costco Wholesale', 'ticker': 'COST', 'revenue': 226954000000, 'annualProfit': 5844000000, 'domain': 'costco.com'}, 
        {'name': 'Microsoft', 'ticker': 'MSFT', 'revenue': 198270000000, 'annualProfit': 72738000000, 'domain': 'microsoft.com'}, 
        {'name': 'Cardinal Health', 'ticker': 'CAH', 'revenue': 181364000000, 'annualProfit': -933000000, 'domain': 'cardinalhealth.com'}, 
        {'name': 'Cigna Group', 'ticker': 'CI', 'revenue': 180516000000, 'annualProfit': 6668000000, 'domain': 'cigna.com'}, 
        {'name': 'Marathon Petroleum', 'ticker': 'MPC', 'revenue': 180012000000, 'annualProfit': 14516000000, 'domain': 'marathonpetroleum.com'}, 
        {'name': 'Phillips 66', 'ticker': 'PSX', 'revenue': 175702000000, 'annualProfit': 11024000000, 'domain': 'phillips66.com'}, 
        {'name': 'Valero Energy', 'ticker': 'VLO', 'revenue': 171189000000, 'annualProfit': 11528000000, 'domain': 'valero.com'}, 
        {'name': 'Ford Motor', 'ticker': 'F', 'revenue': 158057000000, 'annualProfit': -1981000000, 'domain': 'ford.com'}, 
        {'name': 'Home Depot', 'ticker': 'HD', 'revenue': 157403000000, 'annualProfit': 17105000000, 'domain': 'homedepot.com'}, 
        {'name': 'General Motors', 'ticker': 'GM', 'revenue': 156735000000, 'annualProfit': 9934000000, 'domain': 'gm.com'}, 
        {'name': 'Elevance Health', 'ticker': 'ELV', 'revenue': 156595000000, 'annualProfit': 6025000000, 'domain': 'elevancehealth.com'}, 
        {'name': 'JPMorgan Chase', 'ticker': 'JPM', 'revenue': 154792000000, 'annualProfit': 37676000000, 'domain': 'jpmorganchase.com'}, 
        {'name': 'Kroger', 'ticker': 'KR', 'revenue': 148258000000, 'annualProfit': 2244000000, 'domain': 'thekrogerco.com'}, 
        {'name': 'Centene', 'ticker': 'CNC', 'revenue': 144547000000, 'annualProfit': 1202000000, 'domain': 'centene.com'}, 
        {'name': 'Verizon Communications', 'ticker': 'VZ', 'revenue': 136835000000, 'annualProfit': 21256000000, 'domain': 'verizon.com'}, 
        {'name': 'Walgreens Boots Alliance', 'ticker': 'WBA', 'revenue': 132703000000, 'annualProfit': 4337000000, 'domain': 'walgreensbootsalliance.com'}, 
        {'name': 'Fannie Mae', 'ticker': 'FNMA', 'revenue': 121596000000, 'annualProfit': 12923000000, 'domain': 'fanniemae.com'}, 
        {'name': 'Comcast', 'ticker': 'CMCSA', 'revenue': 121427000000, 'annualProfit': 5370000000, 'domain': 'corporate.comcast.com'}, 
        {'name': 'AT&T', 'ticker': 'T', 'revenue': 120741000000, 'annualProfit': -8524000000, 'domain': 'att.com'}, 
        {'name': 'Meta Platforms', 'ticker': 'META', 'revenue': 116609000000, 'annualProfit': 23200000000, 'domain': 'about.fb.com'}, 
        {'name': 'Bank of America', 'ticker': 'BAC', 'revenue': 115053000000, 'annualProfit': 27528000000, 'domain': 'business.bofa.com'}, 
        {'name': 'Target', 'ticker': 'TGT', 'revenue': 109120000000, 'annualProfit': 2780000000, 'domain': 'target.com'}, 
        {'name': 'Dell Technologies', 'ticker': 'DELL', 'revenue': 102301000000, 'annualProfit': 2442000000, 'domain': 'delltechnologies.com'}, 
        {'name': 'Archer Daniels Midland', 'ticker': 'ADM', 'revenue': 101556000000, 'annualProfit': 4340000000, 'domain': 'adm.com'},
        {'name': 'Citigroup', 'ticker': 'C', 'revenue': 101078000000, 'annualProfit': 14845000000, 'domain': 'citigroup.com'}, 
        {'name': 'United Parcel Service', 'ticker': 'UPS', 'revenue': 100338000000, 'annualProfit': 11548000000, 'domain': 'ups.com'}, 
        {'name': 'Pfizer', 'ticker': 'PFE', 'revenue': 100330000000, 'annualProfit': 31372000000, 'domain': 'pfizer.com'}, 
        {'name': "Lowe's", 'ticker': 'LOW', 'revenue': 97059000000, 'annualProfit': 6437000000, 'domain': 'lowes.com'}, 
        {'name': 'Johnson & Johnson', 'ticker': 'JNJ', 'revenue': 94943000000, 'annualProfit': 17941000000, 'domain': 'jnj.com'}, 
        {'name': 'FedEx', 'ticker': 'FDX', 'revenue': 93512000000, 'annualProfit': 3826000000, 'domain': 'fedex.com'}, 
        {'name': 'Humana', 'ticker': 'HUM', 'revenue': 92870000000, 'annualProfit': 2806000000, 'domain': 'humana.com'}, 
        {'name': 'Energy Transfer', 'ticker': 'ET', 'revenue': 89876000000, 'annualProfit': 4756000000, 'domain': 'energytransfer.com'}, 
        {'name': 'State Farm Insurance', 'ticker': '', 'revenue': 89328000000, 'annualProfit': -6654000000, 'domain': 'statefarm.com'}, 
        {'name': 'Freddie Mac', 'ticker': 'FMCC', 'revenue': 86717000000, 'annualProfit': 9327000000, 'domain': 'freddiemac.com'}, 
        {"name": "PepsiCo", "ticker": "PEP", "revenue": 86392000000, "annualProfit": 8910000000, 'domain': 'Pepsi.com'},
        {'name': 'Wells Fargo', 'ticker': 'WFC', 'revenue': 82859000000, 'annualProfit': 13182000000, 'domain': 'wellsfargo.com'}, 
        {'name': 'Walt Disney', 'ticker': 'DIS', 'revenue': 82722000000, 'annualProfit': 3145000000, 'domain': 'thewaltdisneycompany.com'}, 
        {'name': 'ConocoPhillips', 'ticker': 'COP', 'revenue': 82156000000, 'annualProfit': 18680000000, 'domain': 'conocophillips.com'}, 
        {'name': 'Tesla', 'ticker': 'TSLA', 'revenue': 81462000000, 'annualProfit': 12556000000, 'domain': 'tesla.com'}
    ];


    companies.forEach((company) => {
        const card = document.createElement('div');
        card.classList.add('ticker-card');

        card.style.backgroundImage = `url('https://logo.clearbit.com/${company.domain}?size=700')`;
        card.style.backgroundSize = 'contain'; 
        card.style.backgroundPosition = 'center'; 
        card.style.backgroundRepeat = 'no-repeat'; 

        const infoOverlay = document.createElement('div');
        infoOverlay.classList.add('info-overlay');
    
        const companyName = document.createElement('div');
        companyName.classList.add('company-name');
        if (company.ticker != '') {
            companyName.textContent = company.name + " (" + company.ticker + ")";
        }
        else {
            companyName.textContent = company.name;
        }
        
        const amount = document.createElement('div');
        amount.classList.add('amount');
        amount.textContent = `$0`;
    
        infoOverlay.appendChild(companyName);
        infoOverlay.appendChild(amount);
    
        card.appendChild(infoOverlay);
        tickersElement.appendChild(card);
        
        company.profitSincePageLoad = 0;
        company.lastUpdated = performance.now();
        company.element = amount;
    });

    function updateProfits() {
        const now = performance.now();
        
        companies.forEach(company => {
            const elapsed = (now - company.lastUpdated) / 1000; 
            const profitIncrement = (company.annualProfit / 31536000) * elapsed;
            if (profitIncrement !== 0) {
                company.profitSincePageLoad += profitIncrement;
                company.lastUpdated = now;
                const formattedProfit = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(company.profitSincePageLoad);
                company.element.textContent = formattedProfit;
                company.element.className = 'amount ' + (company.profitSincePageLoad >= 0 ? 'profit-positive' : 'profit-negative');
            }
        });

        requestAnimationFrame(updateProfits); 
    }
    
    requestAnimationFrame(updateProfits); 
});