// Import necessary modules
const { ipcRenderer } = require('electron');
const log = require('electron-log');
const Store = require('electron-store');
const store = new Store();
const { getEnabledProviders, getAllProviders } = require('./src/utils');

// Initialize the providers
const providers = {
	OpenAi: require('./providers/openai'),
	Bard: require('./providers/bard'),
	Bing: require('./providers/bing'),
	Claude: require('./providers/claude'),
	Claude2: require('./providers/claude2'),
	Perplexity: require('./providers/perplexity'),
	Phind: require('./providers/phind'),
	HuggingChat: require('./providers/huggingchat'),
	OobaBooga: require('./providers/oobabooga'),
	Smol: require('./providers/smol'),
};

const {
	drawPanes,
	updateSplitSizes,
} = require('./src/panes');

/* ========================================================================== */
/* Create Panes                                                               */
/* ========================================================================== */

const enabledProviders = getEnabledProviders(providers);

drawPanes(enabledProviders);

// Create an array of pane IDs for the enabled providers
const panes = enabledProviders.map((provider) => `#${provider.paneId()}`);
log.info('panes', panes);

// Initialize the Split.js library to create split views with the pane IDs
const splitInstance = Split(panes, {
	direction: 'horizontal',
	minSize: 0,
});

// Update the split sizes once the Electron app DOM is ready
window.addEventListener('DOMContentLoaded', () => {
	updateSplitSizes(panes, splitInstance);
});

/* ========================================================================== */
/* Dark Mode Listeners                                                        */
/* ========================================================================== */

// // Get the initial value of isDarkMode from the store
// ipcRenderer.invoke('getStoreValue', 'isDarkMode').then((isDarkMode) => {
//     enabledProviders.forEach((provider) => provider.toggleDarkMode(isDarkMode));
// });

// // Listen for changes to the isDarkMode value in the store
// ipcRenderer.on('setStoreValue', (event, key, value) => {
//     if (key === 'isDarkMode') {
//         enabledProviders.forEach((provider) => provider.toggleDarkMode(value));
//     }
// });

/* ========================================================================== */
/* Prompt Input Listeners                                                     */
/* ========================================================================== */

// Get the textarea input element for the prompt
const promptEl = document.getElementById('prompt');
promptEl.focus();

// Get the key binding for submitting the prompt from the store
const SuperPromptEnterKey = store.get('SuperPromptEnterKey', false);

promptEl.addEventListener('keydown', function (event) {
	const isCmdOrCtrl = event.metaKey || event.ctrlKey;
	const isEnter = event.key === 'Enter';

	if ((SuperPromptEnterKey && isEnter) || (isCmdOrCtrl && isEnter)) {
		event.preventDefault();
		document.getElementById('btn').click();
	}
});

/* ========================================================================== */
/* Input Event Listener                                                       */
/* ========================================================================== */

promptEl.addEventListener('input', function (event) {
	const sanitizedInput = promptEl.value
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');
	enabledProviders.forEach((provider) => provider.handleInput(sanitizedInput));
});

/* ========================================================================== */
/* Submit Event Listener                                                      */
/* ========================================================================== */

const form = document.getElementById('form');

form.addEventListener('submit', function (event) {
	const sanitizedInput = promptEl.value
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');

	promptEl.value = '';
	event.preventDefault();

	enabledProviders.forEach((provider) => provider.handleSubmit(sanitizedInput));
});

/* ========================================================================== */
/* Keyboard Shortcut Event Listener                                           */
/* ========================================================================== */

// Map number keys to pane indexes
const paneStates = {};
for (let i = 0; i < panes.length; i++) paneStates[`${i + 1}`] = i;
paneStates['a'] = null;
paneStates['A'] = null;

document.addEventListener('keydown', (event) => {
	if ((event.metaKey || event.ctrlKey) && event.key in paneStates) {
		updateSplitSizes(panes, splitInstance, paneStates[event.key]);
		// event.preventDefault();
	} else if (
		((event.metaKey || event.ctrlKey) && event.key === '+') ||
		((event.metaKey || event.ctrlKey) && event.key === '=')
	) {
		// Increase zoom level with Cmd/Ctrl + '+' or '='
		enabledProviders.forEach((provider) => {
			provider
				.getWebview()
				.setZoomLevel(provider.getWebview().getZoomLevel() + 1);
		});
	} else if ((event.metaKey || event.ctrlKey) && event.key === '-') {
		// Decrease zoom level with Cmd/Ctrl + '-'
		enabledProviders.forEach((provider) => {
			provider
				.getWebview()
				.setZoomLevel(provider.getWebview().getZoomLevel() - 1);
		});
	} else if ((event.shiftKey && event.metaKey && (event.key === 'L' || event.key === 'l'))) {
		// Toggle dark mode with Cmd/Ctrl + Shift + L
		let isDarkMode = false;
		ipcRenderer.invoke('getStoreValue', 'isDarkMode').then((currentDarkMode) => {
			getAllProviders(providers).forEach((provider) => {
				ipcRenderer.invoke('setStoreValue', 'isDarkMode', !currentDarkMode);
				isDarkMode = !currentDarkMode;
			});
		});
		
		console.log('🔵 isDarkMode', isDarkMode);
		try {
			enabledProviders.forEach(provider => provider.handleDarkMode(isDarkMode));
		} catch (err) {
			console.error('🔴🔴 error: ', err);
		}

	}
});




document.addEventListener('keydown', function (event) {
	if (event.shiftKey && event.metaKey && event.keyCode === 70) {
		ipcRenderer.invoke('getStoreValue', 'isFullscreen').then((isFullscreen) => {
			ipcRenderer.invoke('setStoreValue', 'isFullscreen', !isFullscreen);
		});
	}
});
