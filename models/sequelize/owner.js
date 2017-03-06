'use strict';

module.exports = function(db, DataTypes) {
  var owner = db.define('owner', {
      id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    company: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
      street: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
      city: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
    state: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: false
    },
    zipcode: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: false
    },
    
  }, {
    tableName: 'owners',
    timestamps: true,
    classMethods: {
      associate: function(models) {
        owner.belongsTo(models.User);
        
      }
    }
  });

  return owner;
};