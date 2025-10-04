module.exports ={
    apps:[
        {
            name:"apiCofre",
            script:"dist/main.js",
            cwd:__dirname,
            interpreter:"node",
            watch:false,
            windowsHide:true
        }
    ]
}