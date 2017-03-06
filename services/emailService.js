'use strict';

var secrets = require('../config/secrets');
var mailer = require('sendgrid')(secrets.sendgrid.api_key);

var service = {};

var applicationName = 'Benmouaou.com';
var senderAddress = '<Benmouaou@gmail.com>';
var receiverAddress = 'devjaouad@gmail.com';

service.sendRequestPasswordEmail = function(email, host, token, done) {
  var mailOptions = {
    to: email,
    from: senderAddress,
    subject: 'Reset your password on ' + applicationName,
    text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
    'http://' + host + '/reset/' + token + '\n\n' +
    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
  };

  mailer.send(mailOptions, done);
};

service.sendPasswordChangeNotificationEmail = function(email, done) {
  var mailOptions = {
    to: email,
    from: senderAddress,
    subject: 'Your ' + applicationName + ' password has been changed',
    text: 'Hello,\n\n' +
    'This is a confirmation that the password for your account ' + email + ' has just been changed.\n'
  };

  mailer.send(mailOptions, done);
};

service.contactUs = function(name, email, subj, message, done) {
  var mailOptions = {
    to: receiverAddress,
    from: email,
    subject: name,
    text: subj + ' : \n\n' + message
  };

  mailer.send(mailOptions, done);
};

//send email notification when new slide is uploaded
service.NewSlide = function(recipients, firstName, lastName, host, done) {
  var mailOptions = {
    to: recipients,
    from: senderAddress,
    subject: 'New Slide has been uploaded to ' + applicationName,
    text:'This is a notification that a new slide has been uploaded by '
    + firstName + ', ' + lastName + '\n\n' + 'http://' + host + '/slides'
  };
  mailer.send(mailOptions, done);
};

//send email notification when new diagnosis is posted
service.NewDiagnosis = function(recipients, firstName, lastName, host, done) {
  var mailOptions = {
    to: recipients,
    from: senderAddress,
    subject: 'New Diagnosis has been posted to ' + applicationName,
    text:'This is a notification that a new diagnosis has been posted by '
    + firstName + ', ' + lastName + '\n\n' + 'http://' + host + '/slides'
  };
  mailer.send(mailOptions, done);
};

//send email notification when new comment is posted
service.NewComment = function(recipients, firstName, lastName, host, done) {
  var mailOptions = {
    to: recipients,
    from: senderAddress,
    subject: 'New Comment has been posted to ' + applicationName,
    text:'This is a notification that a new comment has been posted by '
    + firstName + ', ' + lastName + '\n\n' + 'http://' + host + '/slides'
  };
  mailer.send(mailOptions, done);
};

service.inviteUsers = function(email, firstName, lastName,NewUserFname, NewUserLname,
                              organization, host, done) {
  var mailOptions = {
    to: email,
    from: senderAddress,
    subject: 'You are invited to join ' + organization + ' organization!',
    text: 'Hello ' + NewUserFname + ', ' + NewUserLname +  '\n\n' + 
    'Please accept our invitation to join our organization by clicking ' + 
    'the link bellow: ' + '\n\n' + 'http://' + host + '/signup'+ '\n\n' +
    'Best regards,' + '\n\n' + lastName + ', ' + firstName
    
  };

  mailer.send(mailOptions, done);
};

module.exports = service;
