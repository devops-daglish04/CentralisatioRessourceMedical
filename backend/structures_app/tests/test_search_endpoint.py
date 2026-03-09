from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from backend.resources_app.models import Resource
from backend.structures_app.views import _city_to_coordinates, _normalize_resource_type, search_structures


class SearchEndpointTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_normalize_resource_aliases(self):
        self.assertEqual(_normalize_resource_type("blood"), Resource.BLOOD)
        self.assertEqual(_normalize_resource_type("médicament"), Resource.MEDICINE)
        self.assertEqual(_normalize_resource_type("oxygen"), Resource.OXYGEN)
        self.assertEqual(_normalize_resource_type("incubators"), Resource.INCUBATOR)
        self.assertIsNone(_normalize_resource_type("unknown"))

    def test_city_to_coordinates_known_city(self):
        coordinates = _city_to_coordinates("Yaounde")
        self.assertIsNotNone(coordinates)
        self.assertAlmostEqual(coordinates[0], 3.8667, places=3)
        self.assertAlmostEqual(coordinates[1], 11.5167, places=3)

    def test_search_returns_400_for_non_numeric_coordinates(self):
        request = self.factory.get("/api/search/", {"lat": "abc", "lng": "11.5"})
        response = search_structures(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("doivent être des nombres", response.data["detail"])

    def test_search_returns_400_for_out_of_range_coordinates(self):
        request = self.factory.get("/api/search/", {"lat": "95", "lng": "11.5"})
        response = search_structures(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("hors limites", response.data["detail"])
