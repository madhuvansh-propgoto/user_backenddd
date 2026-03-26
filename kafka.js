const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "user-app",
  brokers: ["kafka:9092"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "user-group" });

module.exports = { producer, consumer };