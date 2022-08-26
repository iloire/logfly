const log = require('electron-log')
const fs = require('fs') 

function testDb(dbFullPath) {
    try {
        if (fs.existsSync(dbFullPath)) {
            const db = require('better-sqlite3')(dbFullPath)     
            // const stmt = db.prepare('SELECT COUNT(*) FROM sqlite_master')
            // let countTables = stmt.get()
            // console.log('countTables : '+countTables+' '+countTables['COUNT(*)'])
            // // countTables is an object, the value is recovered with a notation between brackets 
            // let result = countTables['COUNT(*)'] >= 2 ? true : false    
            // return result
            const stmtFlights = db.prepare('SELECT COUNT(*) FROM Vol')
            let countFlights = stmtFlights.get()
            // console.log(`Connected on ${dbFullPath} with ${countFlights['COUNT(*)']} flights`);
            return true

        } else {
            log.error('db file not exist : '+dbFullPath)  
            return false
        }        
    } catch (error) {
        log.error('Error occured during checking of '+dbFullPath+' : '+error)
        return false  
    }
}

function createDb(dbFullPath) {
    const db = require('better-sqlite3')(dbFullPath)   
    let creaResult = false
    try {
        let creationVol = 'CREATE TABLE Vol (V_ID integer NOT NULL PRIMARY KEY, V_Date TimeStamp, V_Duree integer,'
        creationVol += 'V_sDuree varchar(20), V_LatDeco double, V_LongDeco double, V_AltDeco integer, '
        creationVol += 'V_Site varchar(100), V_Pays varchar(50), V_Commentaire Long Text, V_IGC Long Text, V_Photos Long Text,UTC integer, V_CFD integer,V_Engin Varchar(10), '
        creationVol += 'V_League integer, V_Score Long Text)'
        const stmtCreaVol = db.prepare(creationVol)
        const infoVol = stmtCreaVol.run()
        if (infoVol.changes == 0) {
            let creationSite = 'CREATE TABLE Site(S_ID integer NOT NULL primary key,S_Nom varchar(50),S_Localite varchar(50),'
            creationSite += 'S_CP varchar(8),S_Pays varchar(50),S_Type varchar(1),S_Orientation varchar(20),S_Alti varchar(12),'
            creationSite += 'S_Latitude double,S_Longitude double,S_Commentaire Long Text,S_Maj varchar(10))'
            const stmtCreaSite = db.prepare(creationSite)
            const infoSite = stmtCreaSite.run()
            if (infoSite.changes == 0) creaResult = true
        }     
    } catch (error) {
        log.error('Error occured during creation of '+dbFullPath+' : '+error)
    }
    return creaResult
}

module.exports.testDb = testDb
module.exports.createDb = createDb