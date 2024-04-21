document.addEventListener('DOMContentLoaded', function() {
    const tickersElement = document.getElementById('tickers');

    const companies = [
        {"name": "Walmart", "ticker": "WMT", "revenue": 611289000000, "annualProfit": 11680000000},
        {"name": "Amazon.com", "ticker": "AMZN", "revenue": 513983000000, "annualProfit": -2722000000},
        {"name": "Exxon Mobil", "ticker": "XOM", "revenue": 413680000000, "annualProfit": 55740000000},
        {"name": "Apple", "ticker": "AAPL", "revenue": 394328000000, "annualProfit": 99803000000},
        {"name": "UnitedHealth Group", "ticker": "UNH", "revenue": 324162000000, "annualProfit": 20120000000},
        {"name": "CVS Health", "ticker": "CVS", "revenue": 322467000000, "annualProfit": 4149000000},
        {"name": "Berkshire Hathaway", "ticker": "BRKA", "revenue": 302089000000, "annualProfit": -22819000000},
        {"name": "Alphabet", "ticker": "GOOGL", "revenue": 282836000000, "annualProfit": 59972000000},
        {"name": "McKesson", "ticker": "MCK", "revenue": 263966000000, "annualProfit": 1114000000},
        {"name": "Chevron", "ticker": "CVX", "revenue": 246252000000, "annualProfit": 35465000000},
        {"name": "AmerisourceBergen", "ticker": "ABC", "revenue": 238587000000, "annualProfit": 1699000000},
        {"name": "Costco Wholesale", "ticker": "COST", "revenue": 226954000000, "annualProfit": 5844000000},
        {"name": "Microsoft", "ticker": "MSFT", "revenue": 198270000000, "annualProfit": 72738000000},
        {"name": "Cardinal Health", "ticker": "CAH", "revenue": 181364000000, "annualProfit": -933000000},
        {"name": "Cigna Group", "ticker": "CI", "revenue": 180516000000, "annualProfit": 6668000000},
        {"name": "Marathon Petroleum", "ticker": "MPC", "revenue": 180012000000, "annualProfit": 14516000000},
        {"name": "Phillips 66", "ticker": "PSX", "revenue": 175702000000, "annualProfit": 11024000000},
        {"name": "Valero Energy", "ticker": "VLO", "revenue": 171189000000, "annualProfit": 11528000000},
        {"name": "Ford Motor", "ticker": "F", "revenue": 158057000000, "annualProfit": -1981000000},
        {"name": "Home Depot", "ticker": "HD", "revenue": 157403000000, "annualProfit": 17105000000},
        {"name": "General Motors", "ticker": "GM", "revenue": 156735000000, "annualProfit": 9934000000},
        {"name": "Elevance Health", "ticker": "ELV", "revenue": 156595000000, "annualProfit": 6025000000},
        {"name": "JPMorgan Chase", "ticker": "JPM", "revenue": 154792000000, "annualProfit": 37676000000},
        {"name": "Kroger", "ticker": "KR", "revenue": 148258000000, "annualProfit": 2244000000},
        {"name": "Centene", "ticker": "CNC", "revenue": 144547000000, "annualProfit": 1202000000},
        {"name": "Verizon Communications", "ticker": "VZ", "revenue": 136835000000, "annualProfit": 21256000000},
        {"name": "Walgreens Boots Alliance", "ticker": "WBA", "revenue": 132703000000, "annualProfit": 4337000000},
        {"name": "Fannie Mae", "ticker": "FNMA", "revenue": 121596000000, "annualProfit": 12923000000},
        {"name": "Comcast", "ticker": "CMCSA", "revenue": 121427000000, "annualProfit": 5370000000},
        {"name": "AT&T", "ticker": "T", "revenue": 120741000000, "annualProfit": -8524000000},
        {"name": "Meta Platforms", "ticker": "META", "revenue": 116609000000, "annualProfit": 23200000000},
        {"name": "Bank of America", "ticker": "BAC", "revenue": 115053000000, "annualProfit": 27528000000},
        {"name": "Target", "ticker": "TGT", "revenue": 109120000000, "annualProfit": 2780000000},
        {"name": "Dell Technologies", "ticker": "DELL", "revenue": 102301000000, "annualProfit": 2442000000},
        {"name": "Archer Daniels Midland", "ticker": "ADM", "revenue": 101556000000, "annualProfit": 4340000000},
        {"name": "Citigroup", "ticker": "C", "revenue": 101078000000, "annualProfit": 14845000000},
        {"name": "United Parcel Service", "ticker": "UPS", "revenue": 100338000000, "annualProfit": 11548000000},
        {"name": "Pfizer", "ticker": "PFE", "revenue": 100330000000, "annualProfit": 31372000000},
        {"name": "Lowe's", "ticker": "LOW", "revenue": 97059000000, "annualProfit": 6437000000},
        {"name": "Johnson & Johnson", "ticker": "JNJ", "revenue": 94943000000, "annualProfit": 17941000000},
        {"name": "FedEx", "ticker": "FDX", "revenue": 93512000000, "annualProfit": 3826000000},
        {"name": "Humana", "ticker": "HUM", "revenue": 92870000000, "annualProfit": 2806000000},
        {"name": "Energy Transfer", "ticker": "ET", "revenue": 89876000000, "annualProfit": 4756000000},
        {"name": "State Farm Insurance", "ticker": "", "revenue": 89328000000, "annualProfit": -6654000000},
        {"name": "Freddie Mac", "ticker": "FMCC", "revenue": 86717000000, "annualProfit": 9327000000},
        {"name": "PepsiCo", "ticker": "PEP", "revenue": 86392000000, "annualProfit": 8910000000},
        {"name": "Wells Fargo", "ticker": "WFC", "revenue": 82859000000, "annualProfit": 13182000000},
        {"name": "Walt Disney", "ticker": "DIS", "revenue": 82722000000, "annualProfit": 3145000000},
        {"name": "ConocoPhillips", "ticker": "COP", "revenue": 82156000000, "annualProfit": 18680000000},
        {"name": "Tesla", "ticker": "TSLA", "revenue": 81462000000, "annualProfit": 12556000000}
    ]

    const companyThemes = {
        "Apple": { textColor: "#ffffff", backgroundColor: "#a1a1a1" },
        "Amazon.com": { textColor: "#FF9900", backgroundColor: "#146EB4" },
        // Add more companies and their themes here
        "default": { textColor: "#333333", backgroundColor: "#f9f9f9" } // Default theme
    };  

    companies.forEach(company => {
        const profitPerMs = company.annualProfit / 31536000000;
        company.profitSincePageLoad = 0;

        const card = document.createElement('div');
        card.classList.add('ticker-card');
        const theme = companyThemes[company.name] || companyThemes["default"];
        card.style.color = theme.textColor;
        card.style.backgroundColor = theme.backgroundColor;

        const companyName = document.createElement('div');
        companyName.classList.add('company-name');
        companyName.innerText = company.name;
        card.appendChild(companyName);

        const amount = document.createElement('div');
        amount.classList.add('amount');
        amount.innerText = `$0`;
        card.appendChild(amount);

        tickersElement.appendChild(card);

        setInterval(() => {
            company.profitSincePageLoad += profitPerMs;
            const formattedProfit = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(company.profitSincePageLoad);
            amount.innerText = formattedProfit;
            amount.classList.remove('profit-positive', 'profit-negative');
            amount.classList.add(company.profitSincePageLoad >= 0 ? 'profit-positive' : 'profit-negative');
        }, 1);
    });
});