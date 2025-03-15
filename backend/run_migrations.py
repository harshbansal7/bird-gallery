from app import create_app
from app.utils.db_migrate import run_migrations
import logging

def main():
    app = create_app()
    # Enable debug mode
    app.debug = True
    # Set logging level to DEBUG for more detailed logs
    app.logger.setLevel(logging.DEBUG)
    with app.app_context():
        run_migrations()

if __name__ == "__main__":
    main()