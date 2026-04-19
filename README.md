15 minute 100% vibecoded instagram tool that translates the last sent message in a chat and sends it.

lowkey would probably work on macos, idk if windows, but this is made and tested on linux

install chromium, or a chromium based browser using package manager of choice and open it with a remote debugging port

in a terminal (if using chromium on fedora 43): `chromium-browser --remote-debugging-port=9222`

log into instagram and open a direct message.

oh and install `bun` too

clone this repo: `git clone https://github.com/numairfm/instagram-livetranslate.git`

install puppeteer: `bun add puppeteer`

then finally run: `bun bot.ts`

it will show you how many messages it sees on screen and options to test sending messages,
change translated language, and to start listening for messages to translate in real time.

enjoy!!!!!
