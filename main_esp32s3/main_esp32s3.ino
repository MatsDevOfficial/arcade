
#include <WiFi.h>
#include <esp_now.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ESP_I2S.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

#define BTN1 4
#define BTN2 12
#define BTN3 13
#define BTN4 27

#define I2S_WS 15
#define I2S_SD 32
#define I2S_SCK 14

uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

I2SClass i2s;

typedef struct struct_message {
  float temperature;
  int moisture;
} struct_message;

struct_message incomingData;

float remoteTemp = 0;
int remoteMoisture = 0;
unsigned long lastPacket = 0;

void onDataRecv(const esp_now_recv_info *info, const uint8_t *incomingDataBytes, int len) {
  if (incomingDataBytes == nullptr || len < (int)sizeof(incomingData)) {
    return;
  }
  memcpy(&incomingData, incomingDataBytes, sizeof(incomingData));
  remoteTemp = incomingData.temperature;
  remoteMoisture = incomingData.moisture;
  lastPacket = millis();
}

bool setupMic() {
  i2s.setPins(I2S_SCK, I2S_WS, -1, I2S_SD);
  return i2s.begin(I2S_MODE_STD, 16000, I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO);
}

int readMicLevel() {
  int32_t samples[64];
  size_t bytesRead = i2s.readBytes((char *)samples, sizeof(samples));
  if (bytesRead == 0) {
    return 0;
  }

  int count = bytesRead / sizeof(int32_t);
  if (count <= 0) {
    return 0;
  }

  long sum = 0;
  for (int i = 0; i < count; i++) {
    sum += abs(samples[i] >> 8);
  }

  return (int)(sum / count);
}

void drawDisplay(int micLevel) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.println("SMART DESK");

  display.setCursor(0, 14);
  display.print("Temp: ");
  if (remoteTemp < -100.0f) {
    display.println("N/A");
  } else {
    display.print(remoteTemp, 1);
    display.println(" C");
  }

  display.setCursor(0, 26);
  display.print("Soil: ");
  display.print(remoteMoisture);
  display.println("%");

  display.setCursor(0, 38);
  display.print("Mic: ");
  display.println(micLevel);

  display.setCursor(0, 50);
  if (millis() - lastPacket < 10000) {
    display.println("Plant node ONLINE");
  } else {
    display.println("Plant node OFFLINE");
  }

  display.display();
}

void setup() {
  Serial.begin(115200);

  pinMode(BTN1, INPUT_PULLUP);
  pinMode(BTN2, INPUT_PULLUP);
  pinMode(BTN3, INPUT_PULLUP);
  pinMode(BTN4, INPUT_PULLUP);

  Wire.begin(21, 22);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED init failed");
    for (;;) {
      delay(1000);
    }
  }
  display.clearDisplay();
  display.display();

  if (!setupMic()) {
    Serial.println("I2S mic init failed");
  }

  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE);

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    for (;;) {
      delay(1000);
    }
  }

  esp_now_register_recv_cb(onDataRecv);

  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 1;
  peerInfo.encrypt = false;
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("ESP-NOW add peer failed");
  }

  Serial.println("Main ESP ready");
}

void publishTelemetry(int micLevel) {
  static unsigned long lastPublish = 0;
  unsigned long now = millis();
  if (now - lastPublish < 500) {
    return;
  }
  lastPublish = now;

  bool nodeOnline = (now - lastPacket < 10000);

  Serial.print("{\"temp\":");
  if (remoteTemp < -100.0f) {
    Serial.print("null");
  } else {
    Serial.print(remoteTemp, 1);
  }
  Serial.print(",\"soil\":");
  Serial.print(remoteMoisture);
  Serial.print(",\"mic\":");
  Serial.print(micLevel);
  Serial.print(",\"nodeOnline\":");
  Serial.print(nodeOnline ? "true" : "false");
  Serial.println("}");
}

void loop() {
  int micLevel = readMicLevel();
  drawDisplay(micLevel);
  publishTelemetry(micLevel);
  delay(100);
}
