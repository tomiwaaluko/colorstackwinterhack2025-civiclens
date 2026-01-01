import json
from rapidfuzz import fuzz

class PoliticianRepo:
    def __init__(self, db_path: str):
        with open(db_path, 'r') as f:
            self.politicians = json.load(f)

        self._id_index = {p['id']: p for p in self.politicians}

        self._search_cache = {}

    def get_all(self):
        """Get all politicians (no caching needed - already in memory)"""
        return self.politicians

    def get_by_id(self, politician_id: int):
        """Get politician by ID using index (O(1) lookup)"""
        return self._id_index.get(politician_id)

    def search(self, name: str, zip_code: str = None, limit: int = 10):
        """
        Search politicians by name with fuzzy matching and ranking.

        Args:
            name: Politician name to search for (fuzzy matching enabled)
            zip_code: Reserved for future geographic filtering (currently unused)
            limit: Maximum number of results to return (default: 10)

        Returns:
            List of matching politician dictionaries, ranked by relevance
        """
        cache_key = (name.lower(), zip_code, limit)

        if cache_key in self._search_cache:
            return self._search_cache[cache_key]

        # Perform fuzzy search with scoring
        scored_results = []
        name_lower = name.lower()

        for politician in self.politicians:
            politician_name = politician['name'].lower()

            token_score = fuzz.token_sort_ratio(name_lower, politician_name)

            partial_score = fuzz.partial_ratio(name_lower, politician_name)

            word_match = any(name_lower in word.lower() for word in politician['name'].split())

    
            combined_score = (token_score * 0.4) + (partial_score * 0.4) + (100 if word_match else 0) * 0.2

            if combined_score >= 60:
                scored_results.append((politician, combined_score))

        scored_results.sort(key=lambda x: x[1], reverse=True)
        results = [politician for politician, _ in scored_results[:limit]]

        if len(self._search_cache) < 256:
            self._search_cache[cache_key] = results

        return results
        
