import time
from flask import Flask
from app import app, db, User
from sqlalchemy import event
from sqlalchemy.engine import Engine

query_count = 0
query_time = 0.0

@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    context._query_start_time = time.time()

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    global query_count, query_time
    query_count += 1
    query_time += time.time() - context._query_start_time

def test_endpoint(client, url, headers=None):
    global query_count, query_time
    query_count = 0
    query_time = 0.0
    
    t0 = time.time()
    response = client.get(url, headers=headers)
    t1 = time.time()
    
    data_len = len(response.get_data())
    
    print(f"Endpoint: {url}")
    print(f"Total Time: {(t1 - t0)*1000:.2f} ms")
    print(f"SQL Queries: {query_count}")
    print(f"DB Time: {query_time*1000:.2f} ms")
    print(f"Response Size: {data_len/1024:.2f} KB")
    print("-" * 40)

if __name__ == "__main__":
    app.config['TESTING'] = True
    with app.test_client() as client:
        with app.app_context():
            user = User.query.filter_by(role='admin').first()
            token = user.session_token if user else ''
            headers = {'Authorization': token}
            
            test_endpoint(client, '/api/posts', headers)
            test_endpoint(client, '/api/explore/trending', headers)
            test_endpoint(client, '/api/explore/search?q=test', headers)
            test_endpoint(client, '/api/notifications', headers)
            test_endpoint(client, '/api/messages/conversations', headers)
            if user:
                test_endpoint(client, f'/api/users/{user.username}', headers)
