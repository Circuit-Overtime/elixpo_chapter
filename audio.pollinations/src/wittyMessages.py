import random
WITTY_ERROR_MESSAGES = [
    "Oops! Our AI just sneezed and forgot what it was doing. Please try again! 🤧",
    "The hamsters powering our servers are taking a coffee break. Back in a jiffy! ☕",
    "Our audio wizard is currently untangling some digital cables. Please hold! 🎩✨",
    "Error 404: Audio not found, but our sense of humor is still intact! 😄",
    "The sound waves got lost in the matrix. Sending search party now... 🕵️",
    "Our AI is having an existential crisis. We're sending it to therapy! 🤖💭",
    "Looks like someone divided by zero in our audio lab. Classic mistake! 🤦‍♂️",
    "The audio gremlins are at it again! We're getting the debugger spray! 👾",
    "Our servers are playing hide and seek with your request. We're counting to 10... 🙈",
    "Plot twist: The error was inside us all along. But seriously, please try again! 🎭",
    "Houston, we have a problem... but it's probably just a temporary glitch! 🚀",
    "Our AI just blue-screened like it's Windows 95. How nostalgic! 💙",
    "The audio molecules are having a dance party instead of working. Typical! 💃",
    "Error: Success.exe has stopped working. Have you tried turning it off and on again? 🔌",
    "Our digital fairy godmother seems to be on vacation. Please try again later! 🧚‍♀️",
    "The audio synthesis unicorn is taking a bathroom break. Nature calls! 🦄🚽",
    "Someone fed our AI after midnight. Now it's being a gremlin! 🌙👹",
    "Our code is currently having a philosophical debate with itself. Deep stuff! 🤔📚",
    "The server hamster wheel broke. We're getting a replacement from Amazon! 🐹⚙️",
    "Error 418: I'm a teapot, but you wanted audio. Mixed signals! 🫖☕"
]

VALIDATION_ERROR_MESSAGES = [
    "Your request is missing some ingredients for our audio recipe! 🍳",
    "Hmm, that input looks as empty as my motivation on Monday mornings! 😴",
    "We need some text to work with, unless you want us to synthesize the sound of silence! 🤐",
    "Invalid audio format detected! Our AI only speaks fluent WAV, not whatever that was! 🤖",
    "That voice name doesn't exist in our catalog. Did you make it up? Creative! 🎨",
    "Your audio data looks more scrambled than my breakfast eggs! 🍳",
    "Missing required field! It's like trying to bake a cake without flour! 🎂",
    "That's not valid base64... or any base for that matter! 🤷‍♂️"
]

def get_witty_error():
    return random.choice(WITTY_ERROR_MESSAGES)

def get_validation_error():
    return random.choice(VALIDATION_ERROR_MESSAGES)