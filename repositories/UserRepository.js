'use strict';

var db = require('../models/sequelize');
var moment = require('moment');

var PSW_RESET_TOKEN_VALID_FOR = 3; //hours
var ONE_HOUR = 3600000;
var repo = {};

function getEmailFromGithubProfile(profile) {
  var email;

  if(profile.emails && profile.emails.length > 0 && profile.emails[0].value)
    email = profile.emails[0].value;
  else
    email = profile.id + '@github.com';

  return email;
}

function addAvatarToProfile(provider, url, profile) {
  if(!profile.avatars)
    profile.avatars = {};

  if(!url || url.length < 1)
    return;

  profile.avatars[provider] = url;
  if(!profile.picture)
    profile.picture = url;
}

repo.getUserById = function(id) {
  return db.User.findById(id);
};


repo.createUser = function(user) {
  return db.User.count({ where: {$or: [{email: user.email},{hacklicense: user.hacklicense}] }})
    .then(function(c) {
      if (c > 0)
        throw 'Account with that email address or Hack License already exists.';

      var dbUser = db.User.build(user);

      dbUser.set('tokens', {});
      dbUser.set('profile', {});

      return dbUser.save();
    });
};

repo.assignResetPswToken = function(email, token) {
  return db.User.findOne({ where: { email: email } })
    .then(function(user) {
      if(!user)
        throw 'No account with that email address exists.';

      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + PSW_RESET_TOKEN_VALID_FOR * ONE_HOUR;

      return user.save();
    });
};

repo.changeProfileData = function(userId, reqBody) {
  return db.User.findById(userId)
    .then(function(user) {
      user.email = reqBody.email.toLowerCase() || '';
      user.hacklicense = reqBody.hacklicense || '';
      user.firsname = reqBody.firstname.toUpperCase() || '';
      user.lastname = reqBody.lastname.toUpperCase() || '';
      user.phone = reqBody.phone || '';
      user.street = reqBody.street.toUpperCase() || '';
      user.city = reqBody.city.toUpperCase() || '';
      user.state = reqBody.state.toUpperCase() || '';
      user.zipcode = reqBody.zipcode || '';
      user.country = reqBody.country.toUpperCase() || '';
      //user.set('profile', user.profile);

      if(user.changed('email', 'hacklicense')) {
        return db.User.count({ where: {$or: [{email: user.email},{hacklicense: user.hacklicense}] } })
          .then(function(c) {
            if(c > 0)
              throw 'Cannot change e-mail address, because address ' + user.email + ' or ' + user.hacklicense +  ' already exists';

            return user.save();
          });
      }
      return user.save();
    });
};

repo.findUserByResetPswToken = function(token) {
  return db.User.findOne({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    }
  });
};

repo.removeUserById = function(userId) {
  return db.User.destroy({ where: { id: userId } });
};

repo.changeUserPassword = function(userId, newPassword) {
  return db.User.findById(userId)
    .then(function(user) {
      if(!user)
        throw 'Account not found';

      user.password = newPassword;

      return user.save();
    });
};

repo.changeUserPswAndResetToken = function(token, newPassword) {
  if(!token || token.length < 1)
    throw 'Token cannot be empty!';

  return db.User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      }
    })
    .then(function(user) {
      if(!user)
        throw 'User was not found.';

      user.password = newPassword;
      user.set('resetPasswordToken', null);
      user.set('resetPasswordExpires', null);

      return user.save();
    });
};

repo.unlinkProviderFromAccount = function(provider, userId) {
  return db.User.findById(userId)
    .then(function(user) {
      if(!user)
        throw 'User was not found.';

      var attrInfo = {};
      attrInfo[provider + 'Id'] = null;
      attrInfo.tokens = user.tokens || {};
      attrInfo.tokens[provider.toLowerCase()] = null;
      if(provider === 'twitter')
        attrInfo.tokens.twitterSecret = null;

      return user.updateAttributes(attrInfo);
    });
};


/**
 * Facebook
 */
repo.linkFacebookProfile = function(userId, accessToken, refreshToken, profile) {
  var profileId = profile.id.toString();

  return db.User.findOne({ where: { facebookId: profileId } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a Facebook account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.facebookId = profileId;
      if(!user.tokens) user.tokens = {};
      if(!user.profile) user.profile = {};
      user.tokens.facebook = accessToken;
      user.profile.name = user.profile.name || profile.displayName;
      user.profile.gender = user.profile.gender || profile._json.gender;
      addAvatarToProfile('facebook', 'https://graph.facebook.com/' + profileId + '/picture?type=large', user.profile);
      user.set('tokens', user.tokens);
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromFacebook = function(accessToken, refreshToken, profile) {
  if(!profile._json) {
    throw 'Facebook profile is missing _json property!';
  }
  var profileId = profile.id.toString();

  return db.User.findOne({ where: { facebookId: profileId } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      return db.User.findOne({ where: { email: profile._json.email } })
        .then(function(emailUser) {
          if (emailUser)
            throw 'There is already an account using this email address. Sign in to that account and link it with Facebook manually from Account Settings.';

          var user = db.User.build({ facebookId: profileId });
          user.email = profile._json.email || ( profileId + '@facebook.com' );
          user.tokens = { facebook: accessToken };
          user.profile = {
            name: profile.displayName,
            gender: profile.gender
          };
          addAvatarToProfile('facebook', 'https://graph.facebook.com/' + profileId + '/picture?type=large', user.profile);
          return user.save();
        });
    });
};


/**
 * GitHub
 */
repo.linkGithubProfile = function(userId, accessToken, tokenSecret, profile) {
  var profileId = profile.id.toString();

  return db.User.findOne({ where: { githubId: profileId } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a GitHub account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.githubId = profileId;
      if(!user.tokens) user.tokens = {};
      if(!user.profile) user.profile = {};
      user.tokens.github = accessToken;
      user.profile.name = user.profile.name || profile.displayName;
      user.profile.location = user.profile.location || profile._json.location;
      user.profile.website = user.profile.website || profile._json.blog;
      addAvatarToProfile('github', profile._json.avatar_url, user.profile);
      user.set('tokens', user.tokens);
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromGithub = function(accessToken, tokenSecret, profile) {
  var profileId = profile.id.toString();
  var email = getEmailFromGithubProfile(profile);

  if(!profile._json)
    profile._json = {};

  return db.User.findOne({ where: { githubId: profileId } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      return db.User.findOne({ where: { email: email } })
        .then(function(emailUser) {
          if (emailUser)
            throw 'There is already an account using this email address. Sign in to that account and link it with GitHub manually from Account Settings.';

          var user = db.User.build({ githubId: profileId });
          user.email = email;
          user.tokens = { github: accessToken };
          user.profile = {
            name: profile.displayName,
            location: profile._json.location,
            website: profile._json.blog
          };
          addAvatarToProfile('github', profile._json.avatar_url, user.profile);
          return user.save();
        });
    });
};

/**
 * Twitter
 */
repo.linkTwitterProfile = function(userId, accessToken, tokenSecret, profile) {
  return db.User.findOne({ where: { twitterId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a Twitter account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.twitterId = profile.id.toString();
      if(!user.tokens) user.tokens = {};
      if(!user.profile) user.profile = {};
      user.tokens.twitter = accessToken;
      user.tokens.twitterSecret = tokenSecret;
      user.profile.name = user.profile.name || profile.displayName;
      user.profile.location = user.profile.location || profile._json.location;
      addAvatarToProfile('twitter', profile._json.profile_image_url_https, user.profile);
      user.set('tokens', user.tokens);
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromTwitter = function(accessToken, tokenSecret, profile) {
  return db.User.findOne({ where: { twitterId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      var user = db.User.build({ twitterId: profile.id.toString() });
      user.email = profile.username + "@twitter.com";
      user.tokens = { twitter: accessToken, twitterSecret: tokenSecret };
      user.profile = {
        name: profile.displayName,
        location: profile._json.location
      };
      addAvatarToProfile('twitter', profile._json.profile_image_url_https, user.profile);
      return user.save();
    });
};


/**
 * Google
 */
repo.linkGoogleProfile = function(userId, accessToken, tokenSecret, profile) {
  return db.User.findOne({ where: { googleId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a Google account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.googleId = profile.id.toString();
      if(!user.tokens) user.tokens = {};
      if(!user.profile) user.profile = {};
      user.tokens.google = accessToken;
      user.profile.name = user.profile.name || profile.displayName;
      user.profile.gender = user.profile.gender || profile.gender;
      addAvatarToProfile('google', (profile._json.image ? profile._json.image.url : ''), user.profile);
      user.set('tokens', user.tokens);
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromGoogle = function(accessToken, tokenSecret, profile) {
  return db.User.findOne({ where: { googleId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      return db.User.findOne({ where: { email: profile.emails[0].value } })
        .then(function(existingEmailUser) {
          if (existingEmailUser)
            throw 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.';

          var user = db.User.build({ googleId: profile.id.toString() });
          user.email = profile.emails[0].value;
          user.tokens = { google: accessToken };
          user.profile = {
            name: profile.displayName,
            gender: profile.gender
          };
          addAvatarToProfile('google', (profile._json.image ? profile._json.image.url : ''), user.profile);
          return user.save();
        });
    });
};

/**
 * LinkedIn
 */
repo.linkLinkedInProfile = function(userId, accessToken, tokenSecret, profile) {
  return db.User.findOne({ where: { linkedInId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        throw 'There is already a LinkedIn account that belongs to you. Sign in with that account or delete it, then link it with your current account.';

      return db.User.findById(userId);
    })
    .then(function(user) {
      user.linkedInId = profile.id.toString();
      if(!user.tokens) user.tokens = {};
      if(!user.profile) user.profile = {};
      user.tokens.linkedin = accessToken;
      user.profile.name = user.profile.name || profile.displayName;
      user.profile.location = user.profile.location || (profile._json.location) ? profile._json.location.name : '';
      addAvatarToProfile('linkedin', profile._json.pictureUrl, user.profile);
      user.profile.website = user.profile.website || profile._json.publicProfileUrl;
      user.set('tokens', user.tokens);
      user.set('profile', user.profile);

      return user.save();
    });
};

repo.createAccFromLinkedIn = function(accessToken, tokenSecret, profile) {
  return db.User.findOne({ where: { linkedInId: profile.id.toString() } })
    .then(function(existingUser) {
      if (existingUser)
        return existingUser;

      return db.User.findOne({ where: { email: profile._json.emailAddress } })
        .then(function(existingEmailUser) {
          if (existingEmailUser)
            throw 'There is already an account using this email address. Sign in to that account and link it with LinkedIn manually from Account Settings.';

          var user = db.User.build({ linkedInId: profile.id.toString() });
          user.email = profile._json.emailAddress;
          user.tokens = { linkedin: accessToken };
          user.profile = {
            name: profile.displayName,
            location: (profile._json.location) ? profile._json.location.name : '',
            website: profile._json.publicProfileUrl
          };
          addAvatarToProfile('linkedin', profile._json.pictureUrl, user.profile);
          return user.save();
        });
    });
};

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - OWNERS */
repo.createOwner = function(owner) {
       var dbOwner = db.owner.build(owner);
        return dbOwner.save()
        .then(function(err){
          console.log(err);
        });
};

//for admin
repo.getOwnersAdmin = function() {
  return db.owner.findAll({order: [['id', 'ASC']]})
    .then(function(owner) {
    return owner;
  });
};

repo.getOwners = function(userId) {
  return db.owner.findAll({ where: { UserId: userId }, order: [['id', 'ASC']] })
    .then(function(owners) {
    return global.owners = owners;
  });
};

repo.getOwnerById = function(ownerid) {
  return db.owner.findById(ownerid);
};

repo.removeOwnerById = function(ownerId) {
  return db.owner.destroy({ where: { id: ownerId } });
};

//search owner by id
repo.searchOwnerById = function(ownerId, userid) {
  return db.owner.findAll({where: { id: ownerId, UserId: userid} });
  };
  
//update taxi income  
repo.UpdateOwner = function(updatedFields) {
  return db.owner.update({
    company: updatedFields.company,
    street: updatedFields.street,
    city: updatedFields.city,
    state: updatedFields.state,
    zipcode: updatedFields.zipcode,
    phone: updatedFields.phone
    
  },
  
  {
    where: {id: updatedFields.id}
  });
};
    
  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - TAXIS */
repo.createTaxi = function(taxi) {
      var dbTaxi = db.taxi.build(taxi);
      return dbTaxi.save();
};

// for amdin
repo.getAllTaxiIncome = function() {
  return db.taxi.findAll({order: [['date', 'ASC']]
    })
    .then(function(taxi) {
    return taxi;
  });
};

//for admin
repo.getAllUsers = function() {
  return db.User.findAll({
  order: [['id', 'ASC']]})
  //all including admins
    .then(function(user) {
      return user;
    });
};


repo.getTaxis = function(userid) {
  return db.taxi.findAll({ where: { UserId: userid }, order: [['id', 'ASC']] })
    .then(function(taxis) {
    return taxis;
  });
};

/**
 * Get shift report by taxiId, for update
 */ 
repo.getTaxiById = function(taxiid) {
  return db.taxi.findById(taxiid);
};


/**
 * Delete a shift report based shift report id,
 * In this case taxiId
 */ 
repo.removeTaxiById = function(taxiId) {
  return db.taxi.destroy({ where: { id: taxiId } });
};

/**
 * Search based on userId and week number
 */ 
repo.searchTaxiByWeek = function(week, userid) {
  return db.taxi.findAll({where: {UserId: userid, week: week} });
  };
  
/**
 * Serach based on the week, with ability to sum all data
 * And group by userId and week 
 */ 
repo.searchTaxiByWeekAndGroupBy = function(userid, week) {
  return db.taxi.findAll({ attributes: ['UserId','week', 
  [db.sequelize.fn('sum', db.sequelize.col('ccincome')), 'ccincome'],
      [db.sequelize.fn('sum', db.sequelize.col('cashincome')), 'cashincome'],
      [db.sequelize.fn('sum', db.sequelize.col('cctrips')), 'cctrips'],
      [db.sequelize.fn('sum', db.sequelize.col('cashtrips')), 'cashtrips'],
      [db.sequelize.fn('sum', db.sequelize.col('ezpass')), 'ezpass'],
      [db.sequelize.fn('sum', db.sequelize.col('mtatax')), 'mtatax'],
      [db.sequelize.fn('sum', db.sequelize.col('leasefee')), 'leasefee'],
      [db.sequelize.fn('sum', db.sequelize.col('checks')), 'checks'],
      [db.sequelize.fn('sum', db.sequelize.col('miles')), 'miles'],
      [db.sequelize.fn('sum', db.sequelize.col('cashtips')), 'cashtips'],
      [db.sequelize.fn('sum', db.sequelize.col('gas')), 'gas']],
      where: {  UserId:userid, week: week},
      group: [['week'], ['UserId']]
  });
};

/**
 * Search based the on the year, the result will be
 * The sum of all shift reports and the net income 
 * for the specified year
 */
repo.searchTaxiByYearAndGroupBy = function(userid, year) {
  //'ccincome', 'cashincome', 'cctrips', 'cashtrips', 'ezpass', 'mtatax', 'leasefee', 'checks', 'miles', 'cashtips', 'gas', 
  //attributes: [['SUM', 'ccincome', 'Tccincome']],
  //var year2 = moment('date').format('YYYY');
  //sequelize.literal('extract(YEAR FROM 'Users'.'date') AS year')
  return db.taxi.findAll({ attributes: ['UserId' , 'date',
      [db.sequelize.fn('sum', db.sequelize.col('ccincome')), 'ccincome'],
      [db.sequelize.fn('sum', db.sequelize.col('cashincome')), 'cashincome'],
      [db.sequelize.fn('sum', db.sequelize.col('cctrips')), 'cctrips'],
      [db.sequelize.fn('sum', db.sequelize.col('cashtrips')), 'cashtrips'],
      [db.sequelize.fn('sum', db.sequelize.col('ezpass')), 'ezpass'],
      [db.sequelize.fn('sum', db.sequelize.col('mtatax')), 'mtatax'],
      [db.sequelize.fn('sum', db.sequelize.col('leasefee')), 'leasefee'],
      [db.sequelize.fn('sum', db.sequelize.col('miles')), 'miles'],
      [db.sequelize.fn('sum', db.sequelize.col('cashtips')), 'cashtips'],
      [db.sequelize.fn('sum', db.sequelize.col('gas')), 'gas']],
      // [db.sequelize.fn('year', db.sequelize.col('date')), 'date']],
      where: { UserId: userid, date: year},
      group: [['UserId'],['date']]
  });
};

/**
 * Calculate the user weekly net income after taking out
 * All the expenses
 */ 
repo.getWeeklyIncome = function(userid) {
  //'ccincome', 'cashincome', 'cctrips', 'cashtrips', 'ezpass', 'mtatax', 'leasefee', 'checks', 'miles', 'cashtips', 'gas', 
  //attributes: [['SUM', 'ccincome', 'Tccincome']],
  return db.taxi.findAll({ attributes: ['UserId','week', 
      [db.sequelize.fn('sum', db.sequelize.col('ccincome')), 'ccincome'],
      [db.sequelize.fn('sum', db.sequelize.col('cashincome')), 'cashincome'],
      [db.sequelize.fn('sum', db.sequelize.col('cctrips')), 'cctrips'],
      [db.sequelize.fn('sum', db.sequelize.col('cashtrips')), 'cashtrips'],
      [db.sequelize.fn('sum', db.sequelize.col('ezpass')), 'ezpass'],
      [db.sequelize.fn('sum', db.sequelize.col('mtatax')), 'mtatax'],
      [db.sequelize.fn('sum', db.sequelize.col('leasefee')), 'leasefee'],
      [db.sequelize.fn('sum', db.sequelize.col('checks')), 'checks'],
      [db.sequelize.fn('sum', db.sequelize.col('miles')), 'miles'],
      [db.sequelize.fn('sum', db.sequelize.col('cashtips')), 'cashtips'],
      [db.sequelize.fn('sum', db.sequelize.col('gas')), 'gas']],
      where: { UserId: userid },
      group: [['week'],['UserId']],
      order: [['week', 'ASC']]
    
  })
    .then(function(taxis) {
      return taxis;
      /** Display data to the console for testing purpose
       *===============================================
       */
      // var data = JSON.stringify(taxis);
      // var data2 = JSON.parse(data);
      // console.log(data2);
      // var data = JSON.stringify(taxis);
      // var data2 = JSON.parse(data);
      // console.log(data2);
      
      
  });
};

/**
 * Display daily shift reprot with calculating
 * All data, and calculate the user net income
 * for each report, after taking out all expenses
 */
repo.getGrandTotal = function(userid) {
  //'ccincome', 'cashincome', 'cctrips', 'cashtrips', 'ezpass', 'mtatax', 'leasefee', 'checks', 'miles', 'cashtips', 'gas', 
  //attributes: [['SUM', 'ccincome', 'Tccincome']],
  return db.taxi.findAll({ attributes: ['UserId','date', 
      [db.sequelize.fn('sum', db.sequelize.col('ccincome')), 'ccincome'],
      [db.sequelize.fn('sum', db.sequelize.col('cashincome')), 'cashincome'],
      [db.sequelize.fn('sum', db.sequelize.col('cctrips')), 'cctrips'],
      [db.sequelize.fn('sum', db.sequelize.col('cashtrips')), 'cashtrips'],
      [db.sequelize.fn('sum', db.sequelize.col('ezpass')), 'ezpass'],
      [db.sequelize.fn('sum', db.sequelize.col('mtatax')), 'mtatax'],
      [db.sequelize.fn('sum', db.sequelize.col('leasefee')), 'leasefee'],
      [db.sequelize.fn('sum', db.sequelize.col('checks')), 'checks'],
      [db.sequelize.fn('sum', db.sequelize.col('miles')), 'miles'],
      [db.sequelize.fn('sum', db.sequelize.col('cashtips')), 'cashtips'],
      [db.sequelize.fn('sum', db.sequelize.col('gas')), 'gas']],
      // [db.sequelize.fn('year', db.sequelize.col('date')), 'date']],
      where: { UserId: userid},
      group: [['UserId'],['date']],
      order: [['date', 'ASC']]
    
  })
    .then(function(taxis) {
      return taxis;
      /*Display data to the console for testing purpose
       *===============================================
       */
      // var data = JSON.stringify(taxis);
      // var data2 = JSON.parse(data);
      // console.log(data2);
  });
};
      
//Update shift report
repo.UpdateTaxi = function(updatedFields) {
  return db.taxi.update({
    date: updatedFields.date,
    week: updatedFields.week,
    medallion: updatedFields.medallion.toUpperCase(),
    ownerId: updatedFields.ownerid,
    cashtrips: updatedFields.cashtrips,
    cashincome: updatedFields.cashincome,
    cctrips: updatedFields.cctrips,
    ccincome: updatedFields.ccincome,
    ezpass: updatedFields.ezpass,
    leasefee: updatedFields.leasefee,
    checks: updatedFields.checks,
    miles: updatedFields.miles,
    gas: updatedFields.gas,
    cashtips: updatedFields.cashtips
    
  },
  
  {
    where: {id: updatedFields.id}
  });
};
  
  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - VIOLATIONS */
//Insert new violation record
repo.createViolation = function(violation) {
      var dbViolation = db.violation.build(violation);
      return dbViolation.save();
};

//Website Admin can see all users data 
repo.getAllViolations = function() {
  return db.violation.findAll({order: [['date', 'ASC']]})
    .then(function(violation) {
    return violation;
  });
};

//Get all user violations, And only violations that belong
//To that user
repo.getViolations = function(userid) {
  return db.violation.findAll({ where: { UserId: userid }, order: [['date', 'ASC']] })
    .then(function(taxis) {
    return taxis;
  });
};


repo.getViolationById = function(violationid) {
  return db.violation.findById(violationid);
};

// Remove violation by ViolationId
repo.removeViolationById = function(violationId) {
  return db.violation.destroy({ where: { id: violationId } });
};

//search violation by ViolationId
repo.searchViolationById = function(userid, violationId) {
  return db.violation.findAll({where: { UserId: userid, id: violationId} });
  };
  
//Update shift report  
repo.UpdateViolation = function(updatedFields) {
  return db.violation.update({
    date: updatedFields.date,
    violation: updatedFields.violation,
    cost: updatedFields.cost,
  },
  
  {
    where: {id: updatedFields.id}
  });
};
  
  
  
module.exports = repo;