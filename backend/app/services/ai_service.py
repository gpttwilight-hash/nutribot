"""AI service — GPT-4o Vision integration for food photo analysis."""

import json
import base64
from typing import Optional

from openai import AsyncOpenAI

from app.core.config import get_settings

settings = get_settings()

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

SYSTEM_PROMPT = """You are a nutrition expert. Analyze the food image and return ONLY valid JSON, no explanations.
Response format:
{
  "dish_name": "string (in Russian)",
  "calories_per_100g": number,
  "protein_g_per_100g": number,
  "fat_g_per_100g": number,
  "carbs_g_per_100g": number,
  "estimated_weight_g": number,
  "confidence": number (0.0 to 1.0)
}
If confidence < 0.6, still return your best guess but with the low confidence value."""


async def analyze_food_photo(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Send a food photo to GPT-4o Vision for analysis.
    Returns parsed nutrition data dict.
    """
    if not client:
        raise ValueError("OpenAI API key not configured")

    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this food image and provide nutritional information."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}",
                            "detail": "low",
                        },
                    },
                ],
            },
        ],
        max_tokens=500,
        temperature=0.1,
    )

    content = response.choices[0].message.content.strip()

    # Parse JSON from response (handle markdown code blocks)
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {
            "dish_name": "Не удалось распознать",
            "calories_per_100g": 0,
            "protein_g_per_100g": 0,
            "fat_g_per_100g": 0,
            "carbs_g_per_100g": 0,
            "estimated_weight_g": 100,
            "confidence": 0.0,
        }

    return result
