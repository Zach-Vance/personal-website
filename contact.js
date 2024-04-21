
(function(){
    emailjs.init({
      publicKey: "7D7mt9Q2257zWKmTp",
    });
 })();


 window.onclick = function() {
    document.getElementById("contactBtn").onclick = contactPrep;
    document.getElementById('downloadResumeBtn').onclick = downloadResume; 
}

function contactPrep(){
    var templateParams = {
        from_name: document.getElementById("name").value,
        to_name: "Zach Resume Site",
        message: document.getElementById("message").value,
        reply_to: document.getElementById("email").value,
        "g-recaptcha-response": grecaptcha.getResponse(),
    }; 
    contact(templateParams); 
    return false;
}

function contact(templateParams) {
    console.log(templateParams);
    emailjs.send('service_wzkl0dk', 'template_kmyuvmp', templateParams).then(
        (response) => {
            console.log('SUCCESS!', response.status, response.text);
            document.getElementById("contact-table").innerHTML = "<tr><td colspan=\"2\"><h3>Email sent successfully!</h3></td></tr>";
        },
        (error) => {
            console.log('FAILED...', error);
            document.getElementById("contact-table").innerHTML = "<tr><td colspan=\"2\"><h3>Sorry, there was an error.</h3></td></tr>";
        },
    );
}


let resume_url = "https://drive.google.com/uc?export=download&id=16-h96MBrNqvrVeJJ3KOw7CDWhipa-qLS";

function downloadResume() {
    console.log("clicked");
    window.open('https://drive.google.com/uc?export=download&id=16-h96MBrNqvrVeJJ3KOw7CDWhipa-qLS', '_blank');
};


var enableBtn = function() {
    var button = document.getElementById('downloadResumeBtn');
    var recaptcha = documet.getElementById('resume-recpatcha');
    var label = document.getElementById('resume-instructions');
    button.disabled = false;
    button.style.display = 'inline-block'; 
    recaptcha.style.display = 'none';
    label.style.display = 'none';
};

var disableBtn = function() {
    var button = document.getElementById('downloadResumeBtn');
    button.disabled = true;
    button.style.display = 'none'; 
};

var onloadCallback = function() {
    grecaptcha.render('example3', {
        'sitekey' : '6Lf5BcApAAAAAF0t3oWMDWZfr0-5gQm2XY4YSb9j',
        'callback' : enableBtn,
        'expired-callback': disableBtn
    });
};

