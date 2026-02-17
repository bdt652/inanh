import re

from bson import ObjectId
from pymongo.errors import DuplicateKeyError


class FakeInsertResult:
    def __init__(self, inserted_id: ObjectId) -> None:
        self.inserted_id = inserted_id


class FakeUpdateResult:
    def __init__(self, matched_count: int) -> None:
        self.matched_count = matched_count


class FakeDeleteResult:
    def __init__(self, deleted_count: int) -> None:
        self.deleted_count = deleted_count


class FakeCursor:
    def __init__(self, docs: list[dict]) -> None:
        self.docs = docs

    def sort(self, field: str, direction: int) -> "FakeCursor":
        reverse = direction < 0
        self.docs = sorted(self.docs, key=lambda item: item.get(field, 0), reverse=reverse)
        return self

    async def to_list(self, length: int) -> list[dict]:
        return [doc.copy() for doc in self.docs[:length]]


class FakeCollection:
    def __init__(self, docs: list[dict] | None = None) -> None:
        self.docs: list[dict] = [doc.copy() for doc in (docs or [])]
        self.unique_constraints: list[tuple[str, ...]] = []

    async def create_index(
        self,
        field: str | list[tuple[str, int]],
        unique: bool = False,
        name: str | None = None,
        sparse: bool = False,
    ) -> str:
        _ = sparse
        if unique:
            if isinstance(field, str):
                constraint = (field,)
            else:
                constraint = tuple(key for key, _ in field)
            if constraint not in self.unique_constraints:
                self.unique_constraints.append(constraint)
        return name or "idx_1"

    def _matches_scalar(self, field_value: object, condition: object) -> bool:
        if isinstance(condition, dict):
            if "$exists" in condition:
                exists = field_value is not None
                return exists == bool(condition["$exists"])
            if "$ne" in condition:
                return field_value != condition["$ne"]
            if "$regex" in condition:
                options = str(condition.get("$options", ""))
                flags = re.IGNORECASE if "i" in options else 0
                pattern = str(condition["$regex"])
                return re.search(pattern, str(field_value or ""), flags) is not None
        return field_value == condition

    def _matches(self, doc: dict, query: dict) -> bool:
        for key, value in query.items():
            if key == "$or":
                return any(self._matches(doc, sub_query) for sub_query in value)

            if isinstance(value, dict) and "$exists" in value:
                field_value = doc[key] if key in doc else None
            else:
                field_value = doc.get(key)

            if not self._matches_scalar(field_value, value):
                return False
        return True

    def find(self, query: dict | None = None) -> FakeCursor:
        actual_query = query or {}
        matched = [doc.copy() for doc in self.docs if self._matches(doc, actual_query)]
        return FakeCursor(matched)

    async def find_one(self, query: dict) -> dict | None:
        for doc in self.docs:
            if self._matches(doc, query):
                return doc.copy()
        return None

    async def insert_one(self, doc: dict) -> FakeInsertResult:
        for constraint in self.unique_constraints:
            if any(doc.get(field) is None for field in constraint):
                continue
            if any(all(item.get(field) == doc.get(field) for field in constraint) for item in self.docs):
                raise DuplicateKeyError("duplicate key")

        new_doc = doc.copy()
        if "_id" not in new_doc:
            new_doc["_id"] = ObjectId()
        self.docs.append(new_doc)
        return FakeInsertResult(new_doc["_id"])

    async def update_one(self, query: dict, update: dict) -> FakeUpdateResult:
        target_idx = next((idx for idx, item in enumerate(self.docs) if self._matches(item, query)), None)
        if target_idx is None:
            return FakeUpdateResult(0)

        candidate = self.docs[target_idx].copy()
        candidate.update(update.get("$set", {}))

        for constraint in self.unique_constraints:
            if any(candidate.get(field) is None for field in constraint):
                continue
            for idx, item in enumerate(self.docs):
                if idx == target_idx:
                    continue
                if all(item.get(field) == candidate.get(field) for field in constraint):
                    raise DuplicateKeyError("duplicate key")

        self.docs[target_idx] = candidate
        return FakeUpdateResult(1)

    async def delete_one(self, query: dict) -> FakeDeleteResult:
        target_idx = next((idx for idx, item in enumerate(self.docs) if self._matches(item, query)), None)
        if target_idx is None:
            return FakeDeleteResult(0)

        self.docs.pop(target_idx)
        return FakeDeleteResult(1)


class FakeDB:
    def __init__(self, collections: dict[str, list[dict]] | None = None, ping_ok: bool = True) -> None:
        self.collections: dict[str, FakeCollection] = {
            name: FakeCollection(docs) for name, docs in (collections or {}).items()
        }
        self.ping_ok = ping_ok

    def __getitem__(self, name: str) -> FakeCollection:
        if name not in self.collections:
            self.collections[name] = FakeCollection()
        return self.collections[name]

    async def command(self, command_name: str) -> dict:
        if command_name != "ping":
            raise RuntimeError(f"Unsupported command: {command_name}")
        if not self.ping_ok:
            raise RuntimeError("Database is not reachable.")
        return {"ok": 1}
