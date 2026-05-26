
#include <WiFi.h>
#include <esp_now.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define SOIL_PIN 0
#define TEMP_PIN 1

uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);

typedef struct struct_message {
  float temperature;
  int moisture;
} struct_message;

struct_message data;

void OnDataSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
  Serial.print("Send status: ");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "OK" : "FAIL");
}

float readTemperatureC() {
  sensors.requestTemperatures();
  float temp = sensors.getTempCByIndex(0);
  if (temp == DEVICE_DISCONNECTED_C || temp < -55.0f || temp > 125.0f) {
    return NAN;
  }
  return temp;
}

int readSoilMoisturePercent() {
  int raw = analogRead(SOIL_PIN);
  int moisture = map(raw, 3200, 1200, 0, 100);
  return constrain(moisture, 0, 100);
}

void setup() {
  Serial.begin(115200);

  pinMode(SOIL_PIN, INPUT);

  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE);

  sensors.begin();

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    for (;;) {
      delay(1000);
    }
  }

  esp_now_register_send_cb(OnDataSent);

  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 1;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("ESP-NOW add peer failed");
    for (;;) {
      delay(1000);
    }
  }

  Serial.println("Plant node ready");
}

void loop() {
  float temp = readTemperatureC();
  int moisture = readSoilMoisturePercent();

  data.temperature = isnan(temp) ? -999.0f : temp;
  data.moisture = moisture;

  esp_err_t result = esp_now_send(broadcastAddress, (uint8_t *)&data, sizeof(data));
  if (result != ESP_OK) {
    Serial.println("ESP-NOW send failed");
  }

  Serial.print("Temp: ");
  Serial.println(isnan(temp) ? "N/A" : String(temp, 1));

  Serial.print("Moisture: ");
  Serial.println(moisture);

  delay(5000);
}
