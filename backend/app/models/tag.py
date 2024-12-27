class TagValue:
    def __init__(self, value, parent_info=None):
        self.value = value
        # Only set parent_info if it's not empty
        self.parent_info = parent_info if parent_info else None
    
    def to_dict(self):
        base = {'value': self.value}
        if self.parent_info:  # Only include parent_info if it exists
            base['parent_info'] = self.parent_info
        return base
    
    @staticmethod
    def from_dict(data):
        if isinstance(data, str):
            return TagValue(value=data)
        return TagValue(
            value=data['value'],
            parent_info=data.get('parent_info')
        )

class Tag:
    def __init__(self, name, values=None):
        self.name = name.lower().replace(' ', '_')
        self.values = [
            v if isinstance(v, TagValue) else TagValue(v)
            for v in (values or [])
        ]
    
    def to_dict(self):
        return {
            'name': self.name,
            'values': [v.to_dict() for v in self.values]
        }
    
    @staticmethod
    def from_dict(data):
        values = [
            TagValue.from_dict(v) if isinstance(v, dict) else TagValue(v) 
            for v in data.get('values', [])
        ]
        return Tag(name=data['name'], values=values) 