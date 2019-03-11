'use strict';
 
const path = require('path');
const csv = require('csv');
const parse = require('csv-parse');
const fs = require('fs');
const mailHelper = require('./helpers/mailer');
const handlebars = require('handlebars');

// app/email specific variables
const csvRecords = [];
let eventRegistrations = [];
let failedRecords = [];
const emailColIndexInCSV = 2;   // based on the data in your csv file
const nameColIndexInCSV = 1;   // based on the data in your csv file

const sourceCSVFile = path.join(__dirname, './files/test.csv');
const outCSVFile = path.join(__dirname, './files/error.csv');
const emailTemplate = 'registration-email.html';    // will be used when sending emails
const senderEmailAddress = 'admin@mydomain.com';    // this will show up in the target user's inbox as who sent the email
const emailVars = {
    name: '¡Hola! Email desde Nodejs',
    date: '10-03-2019',
    time: '3:00 PM',
    venue: 'Tepic',
    venueLink: 'https://www.google.com/maps/place/The+Grand+America+Hotel/@40.7574406,-111.8902221,15z/data=!4m2!3m1!1s0x0:0x6fae71fa7326abbd?sa=X&ved=0ahUKEwinuISQtdfaAhUHPo8KHXQODCQQ_BII4AEwCg'
}
const emailSubject = `${emailVars.name}`;


const startExecution = async () => {
    await readCSVFile()
    await sendEmailsToTargetUsers(); 
    console.log('** Emails sent **');
}


const readCSVFile = () => {
    return new Promise((resolve, reject) => {
        fs.createReadStream(sourceCSVFile)
            .pipe(parse({delimiter: ','}))
            .on('data', (csvRow) => {
                csvRecords.push(csvRow);        
            })
            .on('end', () => {
                resolve();
            });
    });
}

const writeCSVFile = (records) => {
    return new Promise((resolve, reject) => {
        try {
            csv.stringify(records, { header: true }, (err, output) => {
                if (err) throw err;
                fs.writeFile(outCSVFile, output, (err) => {
                  if (err) throw err;
                  console.log('csv file saved.');
                  resolve();
                });
            });
        } catch (ex) {
            console.log(ex);
            reject(ex);
        }
    });
}


const sendEmailsToTargetUsers = async () => {
    eventRegistrations = csvRecords;
    failedRecords = [csvRecords[0]]; //add header for failed records csv
    eventRegistrations.splice(0, 1);
    // uncomment the below chunk and put your email & name for testing
    // eventRegistrations = [{
    //     name: "Test User",
    //     email: 'test@test.com'
    // }];
    return new Promise(async (resolve, reject) => {
        try{
            const rawHtml = await mailHelper.readHTMLTemplate(__dirname + "/templates/" + emailTemplate);
            const template = handlebars.compile(rawHtml);
            for (let i = 0, len = eventRegistrations.length; i < len; ++i) {
                const registration = eventRegistrations[i];
                const replacements = {
                    userName: registration[nameColIndexInCSV],
                    eventName: emailVars.name,
                    eventVenue: emailVars.venue,
                    eventDate: emailVars.date,
                    eventTime: emailVars.time,
                    eventVenueLink: emailVars.venueLink
                };
    
                const htmlToSend = template(replacements);
                const mailOptions = {
                    from: senderEmailAddress,
                    to: registration[emailColIndexInCSV],
                    subject: emailSubject,
                    html: htmlToSend
                };
    
                let emailResponse = await mailHelper.sendMail(mailOptions);
                if (!emailResponse) {
                    //Failure Case: Push Failed records in an array
                    failedRecords.push(eventRegistrations[i]);
                }
            }

            if(failedRecords.length > 1) {
                //Write into csv file if records failed
                await writeCSVFile(failedRecords);
            }

            resolve();
        } catch (ex) {
            console.log(ex);
            reject(ex)
        }
        
    });
}

// initialize the awesome!
startExecution();