module.exports = {
    getHomePage: getHomePage
}

function getHomePage (req, res) {
    res.render('index.pug')
}