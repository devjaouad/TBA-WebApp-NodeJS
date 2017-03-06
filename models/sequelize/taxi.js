'use strict';

module.exports = function(db, DataTypes) {
  var taxi = db.define('taxi', {
      id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: false
    },
    week: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false
    },
      medallion: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false
    },
      ccincome: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    cashincome: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    cctrips: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    cashtrips: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    ezpass: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    mtatax: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    leasefee: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    checks: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    miles: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    cashtips: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
    gas: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      unique: false,
      defaultValue: 0
    },
  }, {
    tableName: 'taxis',
    timestamps: true,
    classMethods: {
      associate: function(models) {
        taxi.belongsTo(models.User);
        taxi.belongsTo(models.owner);
      }
    }
  });

  return taxi;
};