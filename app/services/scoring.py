"""Scoring tables for the activity optimizer and logistics planner (pure functions)."""

from __future__ import annotations

ACTIVITY_PROFILES: dict[str, dict] = {
    "running": {
        "name": "Running",
        "icon": "fa-person-running",
        "description": "Best conditions for outdoor running",
        "ideal": {"temp": (45, 65), "wind": (0, 12), "pop": (0, 0.2), "humidity": (30, 70)},
    },
    "dog_walking": {
        "name": "Dog Walking",
        "icon": "fa-dog",
        "description": "Comfortable conditions for walking your dog",
        "ideal": {"temp": (40, 80), "wind": (0, 15), "pop": (0, 0.15), "humidity": (20, 80)},
    },
    "photography": {
        "name": "Photography",
        "icon": "fa-camera",
        "description": "Great light and visibility for outdoor photography",
        "ideal": {"temp": (30, 90), "wind": (0, 20), "pop": (0, 0.1), "humidity": (20, 60)},
    },
    "house_painting": {
        "name": "House Painting",
        "icon": "fa-paint-roller",
        "description": "Dry, mild conditions ideal for exterior painting",
        "ideal": {"temp": (50, 85), "wind": (0, 10), "pop": (0, 0.05), "humidity": (30, 60)},
    },
    "cycling": {
        "name": "Cycling",
        "icon": "fa-bicycle",
        "description": "Safe and comfortable cycling weather",
        "ideal": {"temp": (50, 75), "wind": (0, 15), "pop": (0, 0.15), "humidity": (30, 70)},
    },
    "bbq": {
        "name": "BBQ / Grilling",
        "icon": "fa-fire-burner",
        "description": "Perfect weather for outdoor grilling",
        "ideal": {"temp": (60, 90), "wind": (0, 12), "pop": (0, 0.1), "humidity": (20, 75)},
    },
    "stargazing": {
        "name": "Stargazing",
        "icon": "fa-star",
        "description": "Clear skies for stargazing (nighttime preferred)",
        "ideal": {"temp": (30, 80), "wind": (0, 10), "pop": (0, 0.05), "humidity": (10, 50)},
    },
    "gardening": {
        "name": "Gardening",
        "icon": "fa-seedling",
        "description": "Comfortable conditions for outdoor gardening",
        "ideal": {"temp": (50, 85), "wind": (0, 15), "pop": (0, 0.2), "humidity": (40, 80)},
    },
    "car_washing": {
        "name": "Car Washing",
        "icon": "fa-car",
        "description": "Dry weather with no rain expected",
        "ideal": {"temp": (50, 90), "wind": (0, 10), "pop": (0, 0.05), "humidity": (20, 60)},
    },
}


def trapezoid_score(value: float, low: float, high: float, margin: float | None = None) -> float:
    """100 inside [low, high], tapering linearly to 0 at `margin` outside."""
    if margin is None:
        margin = (high - low) * 0.5 if (high - low) > 0 else 10
    if low <= value <= high:
        return 100.0
    if value < low:
        return max(0.0, 100 * (1 - (low - value) / margin))
    return max(0.0, 100 * (1 - (value - high) / margin))


def score_window(temp: float, wind: float, pop: float, humidity: float, profile: dict) -> float:
    ideal = profile["ideal"]
    scores = [
        trapezoid_score(temp, *ideal["temp"]),
        trapezoid_score(wind, *ideal["wind"]),
        trapezoid_score(pop, *ideal["pop"], margin=0.3),
        trapezoid_score(humidity, *ideal["humidity"]),
    ]
    weights = [0.3, 0.15, 0.35, 0.2]
    return round(sum(s * w for s, w in zip(scores, weights, strict=True)), 1)


def weather_penalty(weather_id: int, pop: float = 0, wind: float = 0, temp: float = 70) -> float:
    penalty = 0.0
    if 200 <= weather_id < 300:
        penalty += 30
    elif 300 <= weather_id < 500:
        penalty += 5
    elif 500 <= weather_id < 600:
        penalty += 15
    elif 600 <= weather_id < 700:
        penalty += 20
    elif 700 <= weather_id < 800:
        penalty += 15
    if pop > 0.5:
        penalty += 10
    if wind > 25:
        penalty += 10
    if temp > 100 or temp < 20:
        penalty += 10
    return penalty


def penalty_label(penalty: float) -> str:
    if penalty == 0:
        return "Clear"
    if penalty < 10:
        return "Good"
    if penalty < 20:
        return "Fair"
    return "Poor"
