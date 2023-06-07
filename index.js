const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();


// middleware

app.use(express.json())
app.use(cors())


app.get('/', (req, res) => {
    res.send('lens legacy is running.')
})

app.listen(port, () => {
    console.log(`lens legacy is running on port ${port}`)
})