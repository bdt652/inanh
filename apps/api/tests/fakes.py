import re

from bson import ObjectId
from pymongo.errors import DuplicateKeyError, OperationFailure


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
        self.indexes: dict[str, dict] = {}

    def _resolve_path(self, doc: dict, path: str) -> tuple[dict, str]:
        parts = path.split(".")
        current = doc
        for part in parts[:-1]:
            if part not in current or not isinstance(current[part], dict):
                current[part] = {}
            current = current[part]
        return current, parts[-1]

    async def create_index(
        self,
        field: str | list[tuple[str, int]],
        unique: bool = False,
        name: str | None = None,
        sparse: bool = False,
        **kwargs,
    ) -> str:
        _ = sparse
        index_name = name or "idx_1"
        if unique:
            if isinstance(field, str):
                constraint = (field,)
            else:
                constraint = tuple(key for key, _ in field)
            if constraint not in self.unique_constraints:
                self.unique_constraints.append(constraint)
        self.indexes[index_name] = {
            "unique": unique,
            "partialFilterExpression": kwargs.get("partialFilterExpression"),
            "expireAfterSeconds": kwargs.get("expireAfterSeconds"),
        }
        return index_name

    async def index_information(self) -> dict:
        return {name: info.copy() for name, info in self.indexes.items()}

    async def drop_index(self, name: str) -> None:
        if name not in self.indexes:
            raise OperationFailure("index not found")
        self.indexes.pop(name, None)

    def _matches_scalar(self, field_value: object, condition: object) -> bool:
        if isinstance(condition, dict):
            if "$exists" in condition:
                exists = field_value is not None
                return exists == bool(condition["$exists"])
            if "$in" in condition:
                values = condition.get("$in") or []
                return field_value in values
            if "$type" in condition:
                type_name = str(condition.get("$type", ""))
                if type_name == "string":
                    return isinstance(field_value, str)
                if type_name == "number":
                    return isinstance(field_value, (int, float))
                return False
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
        if "$set" in update:
            for key, value in update.get("$set", {}).items():
                if "." in key:
                    container, leaf = self._resolve_path(candidate, key)
                    container[leaf] = value
                else:
                    candidate[key] = value

        if "$inc" in update:
            for key, delta in update.get("$inc", {}).items():
                container, leaf = self._resolve_path(candidate, key)
                current = container.get(leaf, 0)
                container[leaf] = current + delta

        if "$addToSet" in update:
            for key, value in update.get("$addToSet", {}).items():
                container, leaf = self._resolve_path(candidate, key)
                existing = container.get(leaf)
                if not isinstance(existing, list):
                    existing = []
                if isinstance(value, dict) and "$each" in value:
                    items = value["$each"]
                else:
                    items = [value]
                for item in items:
                    if item not in existing:
                        existing.append(item)
                container[leaf] = existing

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
