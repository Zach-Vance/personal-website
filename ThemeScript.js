/**
 * Applies the user's preferred theme or defaults to system preference.
 */
function applyPreferredTheme() {
    const theme = localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.classList.add(theme);
}

/**
 * Toggles the theme between light and dark and saves the preference.
 */
function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.classList.remove(currentTheme);
    document.body.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
}

// Wait for the DOM to fully load before attempting to attach event listeners
document.addEventListener('DOMContentLoaded', function() {
    applyPreferredTheme();
    console.log("loaded")
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) { // Check if the toggleButton element exists before adding the event listener
        console.log("function applied")
        toggleButton.addEventListener('click', toggleTheme);
    } else {
        console.error("The theme toggle button was not found.");
    }
});
