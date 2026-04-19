import puppeteer from 'puppeteer-core';

// 1. GLOBAL SETTINGS
let currentTargetLang = "de"; // Default to German

// 2. HIGH-PERFORMANCE TRANSLATION (No libraries needed)
async function quickTranslate(text: string, targetLang: string) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Google Translate API rejected the request.");
        const json = await response.json();
        return json[0][0][0]; 
    } catch (e) {
        console.error("Translation Fetch Error:", e.message);
        return null;
    }
}

async function startBot() {
    let browser, page;
    let connected = false;

    // --- CONNECTION MODAL ---
    while (!connected) {
        console.clear();
        console.log("🔗 Attempting to hook into Chromium (Port 9222)...");
        
        try {
            browser = await puppeteer.connect({
                browserURL: 'http://127.0.0.1:9222',
                defaultViewport: null
            });

            const pages = await browser.pages();
            // Looks for the active Instagram DM tab
            page = pages.find(p => p.url().includes('instagram.com/direct/t/'));

            if (!page) {
                console.log("❌ Error: No Instagram DM tab found.");
                const choice = prompt("Open a chat in Chromium and press [Enter] to try again, or type 'q' to quit:");
                if (choice?.toLowerCase() === 'q') process.exit();
            } else {
                connected = true;
                console.log(`✅ Hooked into: ${page.url()}`);
            }
        } catch (err) {
            console.log("💀 Connection failed. Is Chromium running with --remote-debugging-port=9222?");
            const choice = prompt("Press [Enter] to retry, or 'q' to quit:");
            if (choice?.toLowerCase() === 'q') process.exit();
        }
    }

    // --- MAIN MENU MODAL ---
    while (true) {
        console.log(`\n--- INSTAGRAM BOT MENU [Target: ${currentTargetLang.toUpperCase()}] ---`);
        console.log("1. Run Test (Check Selectors)");
        console.log("2. Type 'Hello!'");
        console.log("3. Start Auto-Translator Listener");
        console.log("4. Change Target Language");
        console.log("q. Quit");
        
        const action = prompt("Select an option:");

        switch (action) {
            case '1':
                await runTest(page);
                break;
            case '2':
                await sendMessage(page, "Hello!");
                break;
            case '3':
                await startListener(page, currentTargetLang);
                return; // The listener loop takes over
            case '4':
                console.log("\nCommon Codes: de (German), es (Spanish), fr (French), ja (Japanese), fil (Filipino)");
                const newLang = prompt("Enter 2-letter language code:");
                if (newLang && newLang.length >= 2) {
                    currentTargetLang = newLang.toLowerCase();
                    console.log(`✅ Target set to: ${currentTargetLang.toUpperCase()}`);
                }
                break;
            case 'q':
                console.log("Catch you later!");
                process.exit();
            default:
                console.log("Invalid option, try again.");
        }
    }
}

// --- HELPER FUNCTIONS ---

async function sendMessage(page: any, text: string) {
    try {
        // Meta's textbox role is the most language-agnostic selector
        const selector = 'div[role="textbox"]';
        await page.waitForSelector(selector, { timeout: 5000 });
        const input = await page.$(selector);

        if (!input) {
            // Fallback for German/Specific UI classes
            console.log("⚠️ role='textbox' not found, trying fallback class...");
            await page.click('p.xat24cr');
        } else {
            // Force focus via JavaScript
            await page.evaluate((el) => el.focus(), input);
            await input.click();
        }

        // Clear and Type
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');

        await page.keyboard.type(text, { delay: 40 });
        
        // Critical pause: Let IG process the input before hitting enter
        await Bun.sleep(400);
        await page.keyboard.press('Enter');
        
        console.log(`📤 Message Sent: ${text}`);
    } catch (e) {
        console.error("❌ Failed to send:", e.message);
    }
}

async function runTest(page: any) {
    console.log("🔍 Running DOM Test...");
    const messages = await page.$$('div[dir="auto"]');
    console.log(`Found ${messages.length} message elements in the current view.`);
}

async function startListener(page: any, lang: string) {
    console.log(`🛰️  Translator Online. [EN -> ${lang.toUpperCase()}]`);
    console.log("Monitoring the last message. Press Ctrl+C to stop.");
    
    let lastHandledText = "";

    setInterval(async () => {
        try {
            // Targeting messages specifically
            const messages = await page.$$('div[dir="auto"]');
            if (messages.length === 0) return;

            const latestElement = messages[messages.length - 1];
            const text = (await page.evaluate(el => el.innerText, latestElement)).trim();

            // Check if it's new, not the bot, and not empty
            if (text !== lastHandledText && !text.startsWith("[Bot]:") && text.length > 0) {
                console.log(`📥 Step 1: Detected Text -> "${text}"`);
                lastHandledText = text;

                console.log(`🔄 Step 2: Requesting Translation to ${lang.toUpperCase()}...`);
                const translated = await quickTranslate(text, lang);

                if (translated) {
                    console.log(`🌐 Step 2 Success: "${translated}"`);
                    console.log("📤 Step 3: Sending...");
                    await sendMessage(page, `[Bot]: ${translated}`);
                } else {
                    console.log("⚠️ Step 2 Failed: Empty translation result.");
                }
            }
        } catch (e) {
            // Silently handle DOM changes or detached elements
        }
    }, 3000); // 3 second polling
}

// START THE ENGINE
startBot();
