# Importiert die notwendigen Module für die API, Koordinatentransformationen und Dateiverarbeitung
from fastapi import FastAPI, File, UploadFile, Form  # FastAPI für die API-Funktionalität
from pyproj import Transformer  # Transformer für Koordinatentransformationen
from fastapi.middleware.cors import CORSMiddleware  # CORS-Middleware für externe API-Zugriffe
import pandas as pd  # Pandas für die Verarbeitung von CSV-Daten
from io import StringIO  # StringIO für die Verarbeitung von CSV-Daten im Speicher

# Erstellt eine Instanz der FastAPI-Anwendung
app = FastAPI()

# Fügt die CORS-Middleware hinzu, um Anfragen von verschiedenen Quellen zu ermöglichen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Erlaubt Anfragen von jeder Domain
    allow_credentials=True,  # Erlaubt die Verwendung von Anmeldedaten (z. B. Cookies)
    allow_methods=["*"],  # Erlaubt alle HTTP-Methoden (GET, POST, etc.)
    allow_headers=["*"],  # Erlaubt alle HTTP-Header
)

# Basisroute, die eine Erfolgsmeldung zurückgibt
@app.get("/")
async def basisverzeichnis():
    return {"status": "alles gut, es funktioniert"}  # JSON-Antwort, um die Funktionalität zu überprüfen

# Route für die Transformation von WGS84 nach LV95
@app.get("/wgs84lv95")
async def wgs84lv95(easting: float, northing: float):
    # Erstellt einen Transformer für die Umrechnung von WGS84 (EPSG:4326) nach LV95 (EPSG:2056)
    transformer = Transformer.from_crs(4326, 2056, always_xy=True)
    # Transformiert die eingegebenen Koordinaten
    nEasting, nNorthing = transformer.transform(easting, northing)
    # Gibt die transformierten Koordinaten zurück
    return {
        "Koordinatensystem": "LV95",  # Zielkoordinatensystem
        "easting": nEasting,  # Transformierter Ostwert
        "northing": nNorthing  # Transformierter Nordwert
    }

# Route für die Transformation von LV95 nach WGS84
@app.get("/lv95wgs84")
async def lv95wgs84(easting: float, northing: float):
    # Erstellt einen Transformer für die Umrechnung von LV95 (EPSG:2056) nach WGS84 (EPSG:4326)
    transformer = Transformer.from_crs(2056, 4326, always_xy=True)
    # Transformiert die eingegebenen Koordinaten
    nEasting, nNorthing = transformer.transform(easting, northing)
    # Gibt die transformierten Koordinaten zurück
    return {
        "Koordinatensystem": "WGS84",  # Zielkoordinatensystem
        "easting": nEasting,  # Transformierter Ostwert
        "northing": nNorthing  # Transformierter Nordwert
    }

# Route für die Verarbeitung und Transformation von hochgeladenen CSV-Dateien
@app.post("/transform-csv")
async def transform_csv(file: UploadFile = File(...), direction: str = Form(...)):
    try:
        # Liest die hochgeladene CSV-Datei in ein Pandas-DataFrame
        df = pd.read_csv(StringIO(await file.read().decode("utf-8")))
        
        # Überprüft, ob die notwendigen Spalten 'easting' und 'northing' in der Datei vorhanden sind
        if "easting" not in df.columns or "northing" not in df.columns:
            return {"error": "CSV-Datei muss 'easting' und 'northing' Spalten enthalten."}

        # Wählt den passenden Transformer basierend auf der Transformationsrichtung
        if direction == "lv95wgs84":
            transformer = Transformer.from_crs(2056, 4326, always_xy=True)
        elif direction == "wgs84lv95":
            transformer = Transformer.from_crs(4326, 2056, always_xy=True)
        else:
            # Gibt eine Fehlermeldung zurück, wenn die Richtung ungültig ist
            return {"error": "Ungültige Transformationsrichtung."}

        # Transformiert die Koordinaten für jede Zeile in der CSV-Datei
        df["transformed_easting"], df["transformed_northing"] = zip(
            *df.apply(lambda row: transformer.transform(row["easting"], row["northing"]), axis=1)
        )

        # Speichert die transformierten Daten in eine neue CSV-Datei im Speicher
        output = StringIO()
        df.to_csv(output, index=False)
        output.seek(0)  # Setzt den Zeiger an den Anfang des Speicherinhalts

        # Gibt die transformierte CSV-Datei als Antwort zurück
        from fastapi.responses import StreamingResponse
        return StreamingResponse(output, media_type="text/csv", headers={
            "Content-Disposition": "attachment; filename=transformed_coordinates.csv"
        })
    except Exception as e:
        # Gibt eine Fehlermeldung zurück, falls ein Fehler auftritt
        return {"error": str(e)}
