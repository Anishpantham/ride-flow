import os
import asyncio
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Use certifi certificates
client = AsyncIOMotorClient(
    os.environ["MONGO_URL"],
    tlsCAFile=certifi.where()
)
db = client[os.environ["DB_NAME"]]

async def test_connection():
    result = await db.test.insert_one({"message": "MongoDB connected!"})
    print("Inserted ID:", result.inserted_id)

asyncio.run(test_connection())
