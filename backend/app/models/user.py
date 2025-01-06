class User:
    def __init__(self, email, role='viewer', user_id=None):
        self.email = email
        self.role = role  # 'admin' or 'viewer'
        self.user_id = user_id

    def to_dict(self):
        return {
            'email': self.email,
            'role': self.role,
            'user_id': self.user_id
        }

    @staticmethod
    def from_dict(data):
        return User(
            email=data['email'],
            role=data.get('role', 'viewer'),
            user_id=data.get('user_id')
        )

    def is_admin(self):
        return self.role == 'admin' 