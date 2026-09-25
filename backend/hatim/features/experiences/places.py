from urllib.parse import urlencode

from hatim.domain.models import Experience


def maps_url(experience: Experience) -> str:
    parameters = {"api": "1", "query": f"{experience.venue}، {experience.neighborhood}، الرياض"}
    if experience.google_place_id and not experience.is_demo:
        parameters["query_place_id"] = experience.google_place_id
    return "https://www.google.com/maps/search/?" + urlencode(parameters)
