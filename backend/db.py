import os
from dotenv import load_dotenv, find_dotenv
import mysql.connector

load_dotenv(find_dotenv(usecwd=True))

def _env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Falta la variable de entorno {name}")
    return v

def get_conn():
    return mysql.connector.connect(
        host=_env("DB_HOST"),
        port=int(_env("DB_PORT")),
        user=_env("DB_USER"),
        password=_env("DB_PASSWORD"),
        database=_env("DB_NAME"),
        autocommit=True,
    )
