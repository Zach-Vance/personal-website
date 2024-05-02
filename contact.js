(function(){
    emailjs.init("7D7mt9Q2257zWKmTp");  
})();

function contactPrep() {
    var templateParams = {
        from_name: document.getElementById("name").value,
        to_name: "Zach Resume Site",
        message: document.getElementById("message").value,
        reply_to: document.getElementById("email").value,
        "g-recaptcha-response": grecaptcha.getResponse()
    }; 
    contact(templateParams); 
    return false;
}

function contact(templateParams) {
    console.log("Sending email", templateParams);
    emailjs.send('service_wzkl0dk', 'template_kmyuvmp', templateParams)
        .then(response => {
            console.log('SUCCESS!', response.status, response.text);
            document.getElementById("contact-form").innerHTML = "<h3>Email sent successfully!</h3>";
        }, error => {
            console.log('FAILED...', error);
            document.getElementById("contact-form").innerHTML = "<h3>Sorry, there was an error.</h3>";
        });
}

function downloadResume() {
    window.open('https://drive.google.com/file/d/1BPOHaALFcMz3noIyA5HVWjiad6XYx9H_/view?usp=sharing', '_blank');
}

var enableBtn = function() {
    document.getElementById('downloadResumeBtn').disabled = false;
    document.getElementById('downloadResumeBtn').style.display = 'block';
    document.getElementById('resume-recpatcha').style.display = 'none';
    document.getElementById('resume-instructions').style.display = 'none';
};

var disableBtn = function() {
    document.getElementById('downloadResumeBtn').disabled = true;
    document.getElementById('downloadResumeBtn').style.display = 'none';
    document.getElementById('resume-recpatcha').style.display = 'block';
    document.getElementById('resume-instructions').style.display = 'block';
};

var onloadCallback = function() {
    grecaptcha.render('resume-recpatcha', {
        'sitekey' : '6Lf5BcApAAAAAF0t3oWMDWZfr0-5gQm2XY4YSb9j',
        'callback' : enableBtn,
        'expired-callback': disableBtn
    });
};


window.onload = function() {
    document.getElementById("contactBtn").onclick = contactPrep;
    document.getElementById('downloadResumeBtn').onclick = downloadResume;
    onloadCallback();  
};
