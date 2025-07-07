import cron from "cron";
import https from "https";

const job = new cron.CronJob("*/14 * * * *", function () {
    https
        .get(process.env.API_URL, (res) => {
        if (res.statusCode === 200) {
            console.log("GET request sent successfully" + new Date());
        } else {
            console.log("Failed to send GET request: " + res.statusCode + " at " + new Date());
        }
    })
        .on("error", (err) => {
        console.error("Error sending GET request: " + err.message + " at " + new Date());
    });
});

export default job;