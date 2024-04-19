
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('calculate').addEventListener('click', function(event) {
        event.preventDefault();
        let loan = parseFloat(document.getElementById('loan').value);
        let rate = parseFloat(document.getElementById('rate').value) / 100 / 12;
        let years = parseInt(document.getElementById('years').value);
        let months = years * 12;
        let balance = loan;
        let payment = loan * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
        let interestTotal = 0;
        document.getElementById("payment_table_div").innerHTML= "<table id=\"paymentsTable\" class=\"payment-table\">" +
            "<caption class=\"caption\">PAYMENT TABLE</caption>" +
                    "<tr class=\"payment-table\">" +
                        "<th class=\"payment-table\">Payment #</th>" +
                        "<th class=\"payment-table\">Payment</th>" +
                        "<th class=\"payment-table\">Payment To Principle</th>" +
                        "<th class=\"payment-table\">Interest Paid</th>" +
                        "<th class=\"payment-table\">Balance</th>" +
                    "</tr>" +
                "</table><br><br><hr>";
        document.getElementById("payment-calculations-div").innerHTML = "<table class=\"payment-calculations\">" +
                "<tr class=\"calc\"><td class=\"calc\">Loan Amount:</td><td class=\"calc\" id=\"loanAmount\">$0.00</td></tr>"+
                "<tr class=\"calc\"><td class=\"calc\">Interest Paid: </td><td class=\"calc\" id=\"interestPaid\">$0.00</td></tr>" +
                "<tr class=\"calc\"><td class=\"calc\">Total Payment: </td><td class=\"calc\" id=\"totalPayment\">$0.00</td></tr> " +
            "</table>";
        let paymentsTable = document.getElementById('paymentsTable');
        // paymentsTable.innerHTML = ''; 

        for (let i = 1; i <= months; i++) {
            let interest = Math.round(balance * rate * 100) / 100;
            let principle = Math.round((payment - interest) * 100) / 100;

            if (balance < payment) {
                principle = balance;
                payment = interest + balance;
                balance = 0;
            } else {
                balance = Math.round((balance - principle) * 100) / 100;
            }

            interestTotal += interest;

            let row = paymentsTable.insertRow(-1);
            row.className = "payment-table";

            let cell0 = row.insertCell(0)
            cell0.textContent = i;
            cell0.className = "payment-table";
            
            let cell1 = row.insertCell(1)
            cell1.textContent = `$${payment.toFixed(2)}`;
            cell1.className = "payment-table";
            
            let cell2 = row.insertCell(2)
            cell2.textContent = `$${principle.toFixed(2)}`;
            cell2.className = "payment-table";
        
            let cell3 = row.insertCell(3)
            cell3.textContent = `$${interest.toFixed(2)}`;
            cell3.className = "payment-table";
            
            let cell4 = row.insertCell(4)
            cell4.textContent = `$${balance.toFixed(2)}`;
            cell4.className = "payment-table";

            if (balance <= 0) break;
        }

        document.getElementById('loanAmount').textContent = `$${loan.toFixed(2)}`;
        document.getElementById('interestPaid').textContent = `$${interestTotal.toFixed(2)}`;
        document.getElementById('totalPayment').textContent = `$${(loan + interestTotal).toFixed(2)}`;
    });
});