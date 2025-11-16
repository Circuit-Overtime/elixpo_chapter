from scriptGenerator import generate_reply
import asyncio

async def generate_ttt(text: str, requestID:str, system: str = None):
    replyText = await generate_reply(f"Prompt: {text} & System: {system}", 300)
    print(f"The generated reply text is: {replyText}")
    return replyText

if __name__ == "__main__":
    async def main():
        text = "Make me a story of the lion king"
        requestID = "request123"
        system = "This is a very tense story"
        await generate_ttt(text, requestID, system)

    asyncio.run(main())