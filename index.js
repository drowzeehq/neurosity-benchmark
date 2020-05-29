const { Notion } = require("@neurosity/notion");
// const Notion = require("@drowzee/notion-mock");
require("dotenv").config();
var fs = require("fs");
const { map } = require("rxjs/operators")
const chalk = require('chalk');

const SAMPLE_RATE = 250
const PACKET_SIZE = 64
const deviceId = process.env.NRST_DEVICE_ID
const email = process.env.NRST_EMAIL
const password = process.env.NRST_PASSWORD

console.log(`${email} attempting to authenticate with ${deviceId}`);

const notion = new Notion({
	deviceId,
});

let i = 0;
const main = async () => {
	await notion
		.login({
			email,
			password,
		})
		.catch((error) => {
			console.log(error);
			throw new Error(error);
		});
	console.log("Logged in");

	// notion.signalQuality().subscribe(signalQuality => {
	//   console.log(signalQuality);
	// });
	await notion.enableLocalMode(true).catch((error) => console.log(error));

	notion.isLocalMode().subscribe((isLocalMode) => {
		console.log('isLocalMode: ', isLocalMode);
	});

	jitterTest(notion)
};

main();

const jitterTest = async (notion) => {
	const DURATION = 10
	const idealVariation = (1000 / SAMPLE_RATE) * PACKET_SIZE
	console.log("---------------")
	console.log(`Jittertest - running for ${DURATION} seconds`)
	console.log("---------------")
	console.log("Optimal, time between packets should be " + idealVariation)
	console.log("Optimal jitter should be less than " + 50)
	console.log("---------------")

	const stats = {
		tooHigh: 0,
		good: 0,
		tooLow: 0
	}

	const jitters = []

	let lastTimestamp = new Date()
	const sub = notion.brainwaves("raw").subscribe(() => {
		const timestamp = new Date()
		const variation = timestamp - lastTimestamp
		jitters.push(variation)
		if (variation > (idealVariation + 50)) {
			console.log("variation: ", chalk.red(variation))
			stats.tooHigh++
		} else if (variation < (idealVariation - 50)) {
			console.log("variation: ", chalk.blue(variation))
			stats.tooLow++
		} else {
			console.log("variation: ", chalk.green(variation))
			stats.good++
		}
		lastTimestamp = timestamp
	});


	setTimeout(() => {
		sub.unsubscribe()
		console.log("---------------")
		console.log("Finished benchmark")
		console.log("---------------")
		const averageJitter = (jitters.reduce((acc, cur) => cur + acc, 0)) / jitters.length
		console.log('averageJitter: ', averageJitter);
		console.log(chalk.red('Variations too high: ' + stats.tooHigh))
		console.log(chalk.blue('Variations too low: ' + stats.tooLow))
		console.log(chalk.green('Variations good: ' + stats.good))
	}, DURATION * 1000)

}
