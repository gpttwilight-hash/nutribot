"""Food service — search, local DB, Open Food Facts API."""

from typing import Optional

import httpx

# Top-1000 popular Russian products (abbreviated sample — extend as needed)
LOCAL_FOOD_DB = [
    {"name": "Куриная грудка", "calories": 165, "protein": 31, "fat": 3.6, "carbs": 0},
    {"name": "Гречка варёная", "calories": 110, "protein": 4.2, "fat": 1.1, "carbs": 21.3},
    {"name": "Рис белый варёный", "calories": 130, "protein": 2.7, "fat": 0.3, "carbs": 28},
    {"name": "Яйцо куриное", "calories": 155, "protein": 12.6, "fat": 10.6, "carbs": 1.1},
    {"name": "Овсянка на воде", "calories": 68, "protein": 2.4, "fat": 1.4, "carbs": 12},
    {"name": "Банан", "calories": 89, "protein": 1.1, "fat": 0.3, "carbs": 22.8},
    {"name": "Яблоко", "calories": 52, "protein": 0.3, "fat": 0.2, "carbs": 14},
    {"name": "Творог 5%", "calories": 121, "protein": 17.2, "fat": 5, "carbs": 1.8},
    {"name": "Творог 0%", "calories": 71, "protein": 18, "fat": 0.6, "carbs": 1.8},
    {"name": "Молоко 2.5%", "calories": 52, "protein": 2.8, "fat": 2.5, "carbs": 4.7},
    {"name": "Кефир 1%", "calories": 40, "protein": 3, "fat": 1, "carbs": 4},
    {"name": "Говядина", "calories": 250, "protein": 26, "fat": 16, "carbs": 0},
    {"name": "Свинина", "calories": 242, "protein": 16, "fat": 21.2, "carbs": 0},
    {"name": "Лосось", "calories": 208, "protein": 20, "fat": 13, "carbs": 0},
    {"name": "Тунец консервированный", "calories": 116, "protein": 25.5, "fat": 0.8, "carbs": 0},
    {"name": "Макароны варёные", "calories": 131, "protein": 5, "fat": 1.1, "carbs": 27.4},
    {"name": "Хлеб белый", "calories": 265, "protein": 9, "fat": 3.2, "carbs": 49},
    {"name": "Хлеб ржаной", "calories": 259, "protein": 8.5, "fat": 3.3, "carbs": 48.3},
    {"name": "Картофель варёный", "calories": 86, "protein": 1.9, "fat": 0.1, "carbs": 20},
    {"name": "Огурец", "calories": 15, "protein": 0.7, "fat": 0.1, "carbs": 3.6},
    {"name": "Помидор", "calories": 18, "protein": 0.9, "fat": 0.2, "carbs": 3.9},
    {"name": "Морковь", "calories": 41, "protein": 0.9, "fat": 0.2, "carbs": 10},
    {"name": "Капуста белокочанная", "calories": 27, "protein": 1.8, "fat": 0.1, "carbs": 4.7},
    {"name": "Брокколи", "calories": 34, "protein": 2.8, "fat": 0.4, "carbs": 7},
    {"name": "Авокадо", "calories": 160, "protein": 2, "fat": 15, "carbs": 8.5},
    {"name": "Миндаль", "calories": 579, "protein": 21, "fat": 50, "carbs": 22},
    {"name": "Грецкий орех", "calories": 654, "protein": 15, "fat": 65, "carbs": 14},
    {"name": "Арахис", "calories": 567, "protein": 26, "fat": 49, "carbs": 16},
    {"name": "Мёд", "calories": 304, "protein": 0.3, "fat": 0, "carbs": 82},
    {"name": "Сахар", "calories": 387, "protein": 0, "fat": 0, "carbs": 100},
    {"name": "Масло сливочное", "calories": 717, "protein": 0.9, "fat": 81, "carbs": 0.1},
    {"name": "Масло подсолнечное", "calories": 884, "protein": 0, "fat": 100, "carbs": 0},
    {"name": "Оливковое масло", "calories": 884, "protein": 0, "fat": 100, "carbs": 0},
    {"name": "Сыр Российский", "calories": 363, "protein": 24.1, "fat": 29.5, "carbs": 0},
    {"name": "Сыр Моцарелла", "calories": 280, "protein": 28, "fat": 17, "carbs": 3.1},
    {"name": "Йогурт натуральный", "calories": 59, "protein": 3.5, "fat": 3.3, "carbs": 3.5},
    {"name": "Сметана 15%", "calories": 162, "protein": 2.6, "fat": 15, "carbs": 3.6},
    {"name": "Шоколад молочный", "calories": 535, "protein": 7.5, "fat": 30, "carbs": 59},
    {"name": "Шоколад тёмный", "calories": 539, "protein": 6.2, "fat": 35, "carbs": 48},
    {"name": "Протеиновый батончик", "calories": 350, "protein": 20, "fat": 12, "carbs": 40},
    {"name": "Протеин сывороточный (порция)", "calories": 120, "protein": 24, "fat": 1, "carbs": 3},
    {"name": "Индейка грудка", "calories": 135, "protein": 30, "fat": 1, "carbs": 0},
    {"name": "Креветки", "calories": 99, "protein": 24, "fat": 0.2, "carbs": 0.2},
    {"name": "Кальмар", "calories": 92, "protein": 15.6, "fat": 1.4, "carbs": 3.1},
    {"name": "Фасоль варёная", "calories": 127, "protein": 8.7, "fat": 0.5, "carbs": 22.8},
    {"name": "Чечевица варёная", "calories": 116, "protein": 9, "fat": 0.4, "carbs": 20},
    {"name": "Нут варёный", "calories": 164, "protein": 8.9, "fat": 2.6, "carbs": 27.4},
    {"name": "Булгур варёный", "calories": 83, "protein": 3.1, "fat": 0.2, "carbs": 18.6},
    {"name": "Кускус варёный", "calories": 112, "protein": 3.8, "fat": 0.2, "carbs": 23.2},
    {"name": "Киноа варёная", "calories": 120, "protein": 4.4, "fat": 1.9, "carbs": 21.3},
]


def search_local(query: str, limit: int = 20) -> list[dict]:
    """Search the local food database (case-insensitive substring match)."""
    query_lower = query.lower()
    results = []
    for item in LOCAL_FOOD_DB:
        if query_lower in item["name"].lower():
            results.append(item)
            if len(results) >= limit:
                break
    return results


async def search_open_food_facts(query: str, limit: int = 20) -> list[dict]:
    """Search Open Food Facts API for products."""
    url = "https://world.openfoodfacts.org/cgi/search.pl"
    params = {
        "search_terms": query,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": limit,
        "lc": "ru",
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            data = resp.json()

        results = []
        for product in data.get("products", []):
            nutriments = product.get("nutriments", {})
            name = product.get("product_name", "").strip()
            if not name:
                continue

            results.append({
                "name": name,
                "calories": round(nutriments.get("energy-kcal_100g", 0)),
                "protein": round(nutriments.get("proteins_100g", 0), 1),
                "fat": round(nutriments.get("fat_100g", 0), 1),
                "carbs": round(nutriments.get("carbohydrates_100g", 0), 1),
                "barcode": product.get("code", ""),
            })

        return results
    except Exception:
        return []


async def search_food(query: str, limit: int = 20) -> list[dict]:
    """
    Combined search: local DB first, then Open Food Facts.
    Priority: local results first, then API results.
    """
    local_results = search_local(query, limit)

    if len(local_results) >= limit:
        return local_results

    remaining = limit - len(local_results)
    api_results = await search_open_food_facts(query, remaining)

    # Deduplicate by name
    seen_names = {r["name"].lower() for r in local_results}
    for item in api_results:
        if item["name"].lower() not in seen_names:
            local_results.append(item)
            seen_names.add(item["name"].lower())

    return local_results[:limit]
