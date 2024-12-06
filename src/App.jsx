// Importieren der React-Bibliothek und der benötigten Material-UI-Komponenten.
import React, { useState } from "react";
import {
  Button, // Interaktiver Button
  Container, // Zentrierter Bereich, um den Inhalt zu umschließen
  Stack, // Flexbox-Komponente für vertikale/horizontale Anordnung
  TextField, // Eingabefeld für Text
  Typography, // Komponente für Überschriften und Texte
  MenuItem, // Einzelne Elemente für Dropdown-Menüs
  Select, // Dropdown-Menü zur Auswahl eines Wertes
  InputLabel, // Beschriftung für Dropdown-Menüs
  FormControl, // Wrapper für Formularelemente
} from "@mui/material";

// Hauptkomponente für die Koordinatentransformation
function KoordinatenTransformation() {
  // React-States für die Verwaltung von Benutzereingaben und Daten.
  const [dienst, setDienst] = useState("LV95_NACH_WGS84"); // Transformationsrichtung
  const [ostwert, setOstwert] = useState(""); // Ostwert für die Eingabe
  const [nordwert, setNordwert] = useState(""); // Nordwert für die Eingabe
  const [transformierteX, setTransformierteX] = useState(""); // Transformierter Ostwert
  const [transformierteY, setTransformierteY] = useState(""); // Transformierter Nordwert
  const [fehler, setFehler] = useState(null); // Fehlernachrichten
  const [csvDownloadUrl, setCsvDownloadUrl] = useState(""); // URL zum Herunterladen der transformierten CSV-Datei

  // Handler zum Wechsel der Transformationsrichtung
  const handleDienstWechsel = (event) => {
    setDienst(event.target.value); // Aktualisiert die Richtung basierend auf der Benutzerauswahl
  };

  // Handler für die Transformation einzelner Koordinaten (manuelle Eingabe)
  const handleTransformation = async () => {
    if (!ostwert || !nordwert) {
      // Wenn ein Wert fehlt, wird eine Fehlermeldung angezeigt.
      setFehler("Bitte geben Sie sowohl Ost- als auch Nordwert ein.");
      return;
    }
    setFehler(null); // Löscht vorherige Fehlermeldungen

    try {
      // Anfrage an die API basierend auf der ausgewählten Richtung.
      const response = await fetch(
        `http://localhost:8000/${
          dienst === "LV95_NACH_WGS84" ? "lv95wgs84" : "wgs84lv95"
        }?easting=${ostwert}&northing=${nordwert}`
      );

      // Fehlerprüfung der API-Antwort.
      if (!response.ok) {
        setFehler(
          "Fehler bei der Transformation. Bitte versuchen Sie es erneut."
        );
        return;
      }

      // Extrahieren der Antwortdaten im JSON-Format.
      const daten = await response.json();
      setTransformierteX(daten.easting.toFixed(3)); // Rundet den Ostwert auf 2 Nachkommastellen
      setTransformierteY(daten.northing.toFixed(3)); // Rundet den Nordwert auf 2 Nachkommastellen
    } catch (error) {
      // Fehler bei der Verarbeitung der Anfrage
      setFehler("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  // Handler für den CSV-Upload und die Verarbeitung.
  const handleCsvUpload = async (event) => {
    const file = event.target.files[0]; // Wählt die hochgeladene Datei aus
    const formData = new FormData(); // FormData-Objekt, um Datei und Parameter zu übermitteln
    formData.append("file", file); // Datei anhängen
    formData.append(
      "direction", // Transformationsrichtung hinzufügen
      dienst === "LV95_NACH_WGS84" ? "lv95wgs84" : "wgs84lv95"
    );

    try {
      // POST-Anfrage an die API mit der hochgeladenen Datei und der Richtung
      const response = await fetch("http://localhost:8000/transform-csv", {
        method: "POST",
        body: formData,
      });

      // Fehlerprüfung der API-Antwort
      if (!response.ok) {
        setFehler("Fehler beim Verarbeiten der CSV-Datei.");
        return;
      }

      // Herunterladen der transformierten CSV-Datei als Blob
      const blob = await response.blob();
      setCsvDownloadUrl(URL.createObjectURL(blob)); // Generiert eine URL für den Download
    } catch (error) {
      // Fehler bei der Verarbeitung der Anfrage
      setFehler("Ein unerwarteter Fehler ist aufgetreten.");
    }
  };

  // Die Benutzeroberfläche wird zurückgegeben
  return (
    <Container maxWidth="sm">
      {" "}
      {/* Begrenzt die Breite auf eine kleine Ansicht */}
      <Stack spacing={4} sx={{ mt: 5 }}>
        {" "}
        {/* Abstand zwischen den Elementen */}
        <Typography variant="h4" align="center">
          {" "}
          {/* Titel */}
          Koordinatentransformation
        </Typography>
        {/* Dropdown zur Auswahl der Transformationsrichtung */}
        <FormControl fullWidth variant="outlined">
          <InputLabel>eigene API</InputLabel>
          <Select
            value={dienst}
            onChange={handleDienstWechsel}
            label="REFRAME Dienst"
          >
            <MenuItem value="LV95_NACH_WGS84">LV95 nach WGS84</MenuItem>
            <MenuItem value="WGS84_NACH_LV95">WGS84 nach LV95</MenuItem>
          </Select>
        </FormControl>
        {/* Manuelle Eingabe von Ost- und Nordwert */}
        <Typography variant="h6">Manuelle Eingabe:</Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Ostwert"
            variant="outlined"
            value={ostwert}
            onChange={(e) => setOstwert(e.target.value)}
            fullWidth
          />
          <TextField
            label="Nordwert"
            variant="outlined"
            value={nordwert}
            onChange={(e) => setNordwert(e.target.value)}
            fullWidth
          />
        </Stack>
        <Button
          variant="contained"
          color="primary"
          onClick={handleTransformation}
          fullWidth
        >
          Transformieren
        </Button>
        {fehler && <Typography color="error">{fehler}</Typography>}{" "}
        {/* Fehlernachricht anzeigen */}
        <Stack direction="row" spacing={2}>
          <TextField
            label="Transformiertes X"
            variant="outlined"
            value={transformierteX}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          <TextField
            label="Transformiertes Y"
            variant="outlined"
            value={transformierteY}
            InputProps={{ readOnly: true }}
            fullWidth
          />
        </Stack>
        {/* Upload von CSV-Dateien */}
        <Typography variant="h6">CSV Hochladen:</Typography>
        <input type="file" accept=".csv" onChange={handleCsvUpload} />
        {csvDownloadUrl && (
          <a href={csvDownloadUrl} download="transformed_coordinates.csv">
            Transformiertes CSV herunterladen
          </a>
        )}
      </Stack>
    </Container>
  );
}

export default KoordinatenTransformation;
