import json

class PoliticianRepo:
    def __init__(self, db_path: str):
        with open(db_path, 'r') as f:
            self.politicians = json.load(f)

    def get_all(self):
        return self.politicians

    def get_by_id(self, politician_id: int):
        for politician in self.politicians:
            if politician['id'] == politician_id:
                return politician
        return None

    def search(self, name: str, zip_code: str = None):
        results = []
        for politician in self.politicians:
            if name.lower() in politician['name'].lower():
                results.append(politician)
        # TODO: Add zip_code filtering when we have that data
        return results
        
