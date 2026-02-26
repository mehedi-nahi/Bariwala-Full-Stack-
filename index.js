const app = require("./app.js");
let PORT = process.env.PORT ;

app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});