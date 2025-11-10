export interface SiddurPrayer {
  name: string;
  nameHebrew: string;
  reference: string;
}

export interface SiddurSection {
  name: string;
  nameHebrew: string;
  prayers: SiddurPrayer[];
}

export interface SiddurService {
  name: string;
  nameHebrew: string;
  sections: SiddurSection[];
}

export interface Siddur {
  name: string;
  nameHebrew: string;
  services: SiddurService[];
}

export const siddurim: Siddur[] = [
  {
    name: 'Ashkenaz',
    nameHebrew: 'אשכנז',
    services: [
      {
        name: 'Weekday Shacharit',
        nameHebrew: 'שחרית של חול',
        sections: [
          {
            name: 'Preparatory Prayers',
            nameHebrew: 'תפילות הכנה',
            prayers: [
              {
                name: 'Modeh Ani',
                nameHebrew: 'מודה אני',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Modeh_Ani'
              },
              {
                name: 'Asher Yatzar',
                nameHebrew: 'אשר יצר',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Asher_Yatzar'
              },
              {
                name: 'Elohai Neshama',
                nameHebrew: 'אלהי נשמה',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Elohai_Neshama'
              }
            ]
          },
          {
            name: 'Morning Blessings',
            nameHebrew: 'בִּרְכּוֹת הַשַּׁחַר',
            prayers: [
              {
                name: 'Morning Blessings',
                nameHebrew: 'ברכות השחר',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Morning_Blessings,_Birchot_HaShachar'
              }
            ]
          },
          {
            name: 'Pesukei Dezimra',
            nameHebrew: 'פסוקי דזמרה',
            prayers: [
              {
                name: 'Baruch SheAmar',
                nameHebrew: 'ברוך שאמר',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Baruch_SheAmar'
              },
              {
                name: 'Ashrei',
                nameHebrew: 'אשרי',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Ashrei'
              },
              {
                name: 'Yishtabach',
                nameHebrew: 'ישתבח',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Yishtabach'
              }
            ]
          },
          {
            name: 'Blessings of the Shema',
            nameHebrew: 'ברכות קריאת שמע',
            prayers: [
              {
                name: 'Barchu',
                nameHebrew: 'ברכו',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Blessings_of_the_Shema,_Barchu'
              },
              {
                name: 'Shema',
                nameHebrew: 'שמע',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Blessings_of_the_Shema,_Shema'
              },
              {
                name: 'VeAhavta',
                nameHebrew: 'ואהבת',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Blessings_of_the_Shema,_VeAhavta'
              },
              {
                name: 'Emet VeYatziv',
                nameHebrew: 'אמת ויציב',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Blessings_of_the_Shema,_Emet_VeYatziv'
              }
            ]
          },
          {
            name: 'Amidah',
            nameHebrew: 'עמידה',
            prayers: [
              {
                name: 'Weekday Amidah',
                nameHebrew: 'שמונה עשרה',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah,_Patriarchs'
              }
            ]
          },
          {
            name: 'Concluding Prayers',
            nameHebrew: 'סיום תפילה',
            prayers: [
              {
                name: 'Aleinu',
                nameHebrew: 'עלינו',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Concluding_Prayers,_Aleinu'
              }
            ]
          }
        ]
      },
      {
        name: 'Weekday Minchah',
        nameHebrew: 'מנחה של חול',
        sections: [
          {
            name: 'Ashrei',
            nameHebrew: 'אשרי',
            prayers: [
              {
                name: 'Ashrei',
                nameHebrew: 'אשרי',
                reference: 'Siddur_Ashkenaz,_Weekday,_Minchah,_Ashrei,_Ashrei'
              }
            ]
          },
          {
            name: 'Amidah',
            nameHebrew: 'עמידה',
            prayers: [
              {
                name: 'Minchah Amidah',
                nameHebrew: 'שמונה עשרה',
                reference: 'Siddur_Ashkenaz,_Weekday,_Minchah,_Amidah,_Patriarchs'
              }
            ]
          }
        ]
      },
      {
        name: 'Weekday Maariv',
        nameHebrew: 'ערבית של חול',
        sections: [
          {
            name: 'Blessings of the Shema',
            nameHebrew: 'ברכות קריאת שמע',
            prayers: [
              {
                name: 'Barchu',
                nameHebrew: 'ברכו',
                reference: 'Siddur_Ashkenaz,_Weekday,_Maariv,_Blessings_of_the_Shema,_Barchu'
              },
              {
                name: 'Shema',
                nameHebrew: 'שמע',
                reference: 'Siddur_Ashkenaz,_Weekday,_Maariv,_Blessings_of_the_Shema,_Shema'
              }
            ]
          },
          {
            name: 'Amidah',
            nameHebrew: 'עמידה',
            prayers: [
              {
                name: 'Maariv Amidah',
                nameHebrew: 'שמונה עשרה',
                reference: 'Siddur_Ashkenaz,_Weekday,_Maariv,_Amidah,_Patriarchs'
              }
            ]
          },
          {
            name: 'Concluding Prayers',
            nameHebrew: 'סיום תפילה',
            prayers: [
              {
                name: 'Aleinu',
                nameHebrew: 'עלינו',
                reference: 'Siddur_Ashkenaz,_Weekday,_Maariv,_Concluding_Prayers,_Aleinu'
              }
            ]
          }
        ]
      },
      {
        name: 'Shabbat',
        nameHebrew: 'שבת',
        sections: [
          {
            name: 'Friday Evening',
            nameHebrew: 'ערב שבת',
            prayers: [
              {
                name: 'Kabbalat Shabbat',
                nameHebrew: 'קבלת שבת',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Kabbalat_Shabbat,_Mizmor_Shir'
              },
              {
                name: 'Lecha Dodi',
                nameHebrew: 'לכה דודי',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Kabbalat_Shabbat,_Lecha_Dodi'
              }
            ]
          },
          {
            name: 'Shabbat Morning',
            nameHebrew: 'שחרית של שבת',
            prayers: [
              {
                name: 'Nishmat',
                nameHebrew: 'נשמת',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Shabbat_Day,_Shacharit,_Pesukei_Dezimra,_Nishmat'
              },
              {
                name: 'Shabbat Amidah',
                nameHebrew: 'עמידה לשבת',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Shabbat_Day,_Shacharit,_Amidah,_Patriarchs'
              }
            ]
          }
        ]
      }
    ]
  }
];
