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
            name: 'Upon Arising',
            nameHebrew: 'בהקיצו',
            prayers: [
              {
                name: 'Modeh Ani',
                nameHebrew: 'מודה אני',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Modeh_Ani'
              },
              {
                name: 'Netilat Yadayim',
                nameHebrew: 'נטילת ידיים',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Netilat_Yadayim'
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
            name: 'Torah Blessings',
            nameHebrew: 'ברכות התורה',
            prayers: [
              {
                name: 'Birchot HaTorah',
                nameHebrew: 'ברכות התורה',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Birchot_HaTorah'
              }
            ]
          },
          {
            name: 'Morning Blessings',
            nameHebrew: 'בִּרְכּוֹת הַשַּׁחַר',
            prayers: [
              {
                name: 'Birchot HaShachar',
                nameHebrew: 'ברכות השחר',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Morning_Blessings,_Birchot_HaShachar'
              },
              {
                name: 'Akedah',
                nameHebrew: 'עקדה',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Morning_Blessings,_Akedah'
              },
              {
                name: 'Korbanot',
                nameHebrew: 'קרבנות',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Morning_Blessings,_Korbanot'
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
                name: 'Hodu',
                nameHebrew: 'הודו',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Hodu'
              },
              {
                name: 'Mizmor LeTodah',
                nameHebrew: 'מזמור לתודה',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Mizmor_LeTodah'
              },
              {
                name: 'Yehi Chevod',
                nameHebrew: 'יהי כבוד',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Yehi_Chevod'
              },
              {
                name: 'Ashrei',
                nameHebrew: 'אשרי',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Ashrei'
              },
              {
                name: 'Halleluyah',
                nameHebrew: 'הללויה',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Halleluyah'
              },
              {
                name: 'Vayevarech David',
                nameHebrew: 'ויברך דוד',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Vayevarech_David'
              },
              {
                name: 'Az Yashir',
                nameHebrew: 'אז ישיר',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Pesukei_Dezimra,_Az_Yashir'
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
                name: 'Yotzer Or',
                nameHebrew: 'יוצר אור',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Blessings_of_the_Shema,_Yotzer_Or'
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
                name: 'VeHaya Im Shamoa',
                nameHebrew: 'והיה אם שמוע',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Blessings_of_the_Shema,_VeHaya_Im_Shamoa'
              },
              {
                name: 'Vayomer',
                nameHebrew: 'ויאמר',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Blessings_of_the_Shema,_Vayomer'
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
            name: 'Post-Amidah',
            nameHebrew: 'אחרי העמידה',
            prayers: [
              {
                name: 'Tachanun',
                nameHebrew: 'תחנון',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Amidah,_Tachanun'
              },
              {
                name: 'Vidui',
                nameHebrew: 'וידוי',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Amidah,_Vidui'
              },
              {
                name: '13 Middot',
                nameHebrew: 'י"ג מידות',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Amidah,_13_Middot'
              }
            ]
          },
          {
            name: 'Concluding Prayers',
            nameHebrew: 'סיום תפילה',
            prayers: [
              {
                name: 'Ashrei',
                nameHebrew: 'אשרי',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Concluding_Prayers,_Ashrei'
              },
              {
                name: 'Uva LeTzion',
                nameHebrew: 'ובא לציון',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Concluding_Prayers,_Uva_LeTzion'
              },
              {
                name: 'Aleinu',
                nameHebrew: 'עלינו',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Concluding_Prayers,_Aleinu'
              },
              {
                name: 'Mourner\'s Kaddish',
                nameHebrew: 'קדיש יתום',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Concluding_Prayers,_Mourner\'s_Kaddish'
              },
              {
                name: 'Shir Shel Yom',
                nameHebrew: 'שיר של יום',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Concluding_Prayers,_Shir_Shel_Yom'
              }
            ]
          },
          {
            name: 'Post-Service',
            nameHebrew: 'אחרי התפילה',
            prayers: [
              {
                name: 'Six Remembrances',
                nameHebrew: 'שש זכירות',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Service,_Six_Remembrances'
              },
              {
                name: 'Pittum HaKetoret',
                nameHebrew: 'פיטום הקטורת',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Service,_Pittum_HaKetoret'
              },
              {
                name: 'Adon Olam',
                nameHebrew: 'אדון עולם',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Service,_Adon_Olam'
              },
              {
                name: 'Yigdal',
                nameHebrew: 'יגדל',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Post_Service,_Yigdal'
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
              },
              {
                name: 'Tachanun',
                nameHebrew: 'תחנון',
                reference: 'Siddur_Ashkenaz,_Weekday,_Minchah,_Amidah,_Tachanun'
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
                reference: 'Siddur_Ashkenaz,_Weekday,_Minchah,_Concluding_Prayers,_Aleinu'
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
                name: 'Maariv Aravim',
                nameHebrew: 'מעריב ערבים',
                reference: 'Siddur_Ashkenaz,_Weekday,_Maariv,_Blessings_of_the_Shema,_Maariv_Aravim'
              },
              {
                name: 'Shema',
                nameHebrew: 'שמע',
                reference: 'Siddur_Ashkenaz,_Weekday,_Maariv,_Blessings_of_the_Shema,_Shema'
              },
              {
                name: 'VeAhavta',
                nameHebrew: 'ואהבת',
                reference: 'Siddur_Ashkenaz,_Weekday,_Maariv,_Blessings_of_the_Shema,_VeAhavta'
              },
              {
                name: 'Emet VeEmunah',
                nameHebrew: 'אמת ואמונה',
                reference: 'Siddur_Ashkenaz,_Weekday,_Maariv,_Blessings_of_the_Shema,_Emet_VeEmunah'
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
            name: 'Kabbalat Shabbat',
            nameHebrew: 'קבלת שבת',
            prayers: [
              {
                name: 'Mizmor Shir LeYom HaShabbat',
                nameHebrew: 'מזמור שיר ליום השבת',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Kabbalat_Shabbat,_Mizmor_Shir'
              },
              {
                name: 'Lecha Dodi',
                nameHebrew: 'לכה דודי',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Kabbalat_Shabbat,_Lecha_Dodi'
              },
              {
                name: 'Psalm 92',
                nameHebrew: 'מזמור צב',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Kabbalat_Shabbat,_Psalm_92'
              },
              {
                name: 'Psalm 93',
                nameHebrew: 'מזמור צג',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Kabbalat_Shabbat,_Psalm_93'
              }
            ]
          },
          {
            name: 'Friday Evening',
            nameHebrew: 'ערב שבת',
            prayers: [
              {
                name: 'Maariv for Shabbat',
                nameHebrew: 'ערבית לשבת',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Maariv,_Amidah,_Patriarchs'
              },
              {
                name: 'Vayechulu',
                nameHebrew: 'ויכלו',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Maariv,_Vayechulu'
              },
              {
                name: 'Kiddush',
                nameHebrew: 'קידוש',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Kiddush,_Kiddush'
              },
              {
                name: 'Shalom Aleichem',
                nameHebrew: 'שלום עליכם',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Home_Prayers,_Shalom_Aleichem'
              },
              {
                name: 'Eshet Chayil',
                nameHebrew: 'אשת חיל',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Friday_Night,_Home_Prayers,_Eshet_Chayil'
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
                name: 'Shochen Ad',
                nameHebrew: 'שוכן עד',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Shabbat_Day,_Shacharit,_Pesukei_Dezimra,_Shochen_Ad'
              },
              {
                name: 'Shabbat Amidah',
                nameHebrew: 'עמידה לשבת',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Shabbat_Day,_Shacharit,_Amidah,_Patriarchs'
              },
              {
                name: 'Kedushah',
                nameHebrew: 'קדושה',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Shabbat_Day,_Shacharit,_Amidah,_Kedushah'
              },
              {
                name: 'Ein Keloheinu',
                nameHebrew: 'אין כאלהינו',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Shabbat_Day,_Shacharit,_Concluding_Prayers,_Ein_Keloheinu'
              }
            ]
          },
          {
            name: 'Musaf',
            nameHebrew: 'מוסף',
            prayers: [
              {
                name: 'Musaf Amidah',
                nameHebrew: 'עמידה למוסף',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Shabbat_Day,_Musaf,_Amidah,_Patriarchs'
              }
            ]
          },
          {
            name: 'Shabbat Afternoon',
            nameHebrew: 'מנחה לשבת',
            prayers: [
              {
                name: 'Minchah for Shabbat',
                nameHebrew: 'מנחה לשבת',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Shabbat_Day,_Minchah,_Amidah,_Patriarchs'
              },
              {
                name: 'Tzidkatcha',
                nameHebrew: 'צדקתך',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Shabbat_Day,_Minchah,_Tzidkatcha'
              }
            ]
          },
          {
            name: 'Havdalah',
            nameHebrew: 'הבדלה',
            prayers: [
              {
                name: 'Havdalah',
                nameHebrew: 'הבדלה',
                reference: 'Siddur_Ashkenaz,_Shabbat,_Motzaei_Shabbat,_Havdalah,_Havdalah'
              }
            ]
          }
        ]
      },
      {
        name: 'Rosh Chodesh',
        nameHebrew: 'ראש חודש',
        sections: [
          {
            name: 'Rosh Chodesh Prayers',
            nameHebrew: 'תפילות ראש חודש',
            prayers: [
              {
                name: 'Hallel',
                nameHebrew: 'הלל',
                reference: 'Siddur_Ashkenaz,_Rosh_Chodesh,_Hallel,_Hallel'
              },
              {
                name: 'Musaf',
                nameHebrew: 'מוסף',
                reference: 'Siddur_Ashkenaz,_Rosh_Chodesh,_Musaf,_Amidah,_Patriarchs'
              }
            ]
          }
        ]
      },
      {
        name: 'Rosh Hashanah',
        nameHebrew: 'ראש השנה',
        sections: [
          {
            name: 'Evening Service',
            nameHebrew: 'ערבית',
            prayers: [
              {
                name: 'Rosh Hashanah Maariv',
                nameHebrew: 'ערבית לראש השנה',
                reference: 'Siddur_Ashkenaz,_Rosh_Hashanah,_First_Day,_Maariv,_Amidah,_Patriarchs'
              }
            ]
          },
          {
            name: 'Morning Service',
            nameHebrew: 'שחרית',
            prayers: [
              {
                name: 'Rosh Hashanah Shacharit',
                nameHebrew: 'שחרית לראש השנה',
                reference: 'Siddur_Ashkenaz,_Rosh_Hashanah,_First_Day,_Shacharit,_Amidah,_Patriarchs'
              },
              {
                name: 'Shofar Blessings',
                nameHebrew: 'ברכות השופר',
                reference: 'Siddur_Ashkenaz,_Rosh_Hashanah,_First_Day,_Shofar,_Blessings'
              }
            ]
          },
          {
            name: 'Musaf',
            nameHebrew: 'מוסף',
            prayers: [
              {
                name: 'Musaf Amidah',
                nameHebrew: 'עמידה למוסף',
                reference: 'Siddur_Ashkenaz,_Rosh_Hashanah,_First_Day,_Musaf,_Amidah,_Patriarchs'
              }
            ]
          }
        ]
      },
      {
        name: 'Yom Kippur',
        nameHebrew: 'יום כיפור',
        sections: [
          {
            name: 'Kol Nidre',
            nameHebrew: 'כל נדרי',
            prayers: [
              {
                name: 'Kol Nidre',
                nameHebrew: 'כל נדרי',
                reference: 'Siddur_Ashkenaz,_Yom_Kippur,_Evening,_Maariv,_Kol_Nidre'
              },
              {
                name: 'Shehecheyanu',
                nameHebrew: 'שהחיינו',
                reference: 'Siddur_Ashkenaz,_Yom_Kippur,_Evening,_Maariv,_Shehecheyanu'
              }
            ]
          },
          {
            name: 'Morning Service',
            nameHebrew: 'שחרית',
            prayers: [
              {
                name: 'Yom Kippur Shacharit',
                nameHebrew: 'שחרית ליום כיפור',
                reference: 'Siddur_Ashkenaz,_Yom_Kippur,_Day,_Shacharit,_Amidah,_Patriarchs'
              },
              {
                name: 'Viddui',
                nameHebrew: 'וידוי',
                reference: 'Siddur_Ashkenaz,_Yom_Kippur,_Day,_Shacharit,_Amidah,_Viddui'
              }
            ]
          },
          {
            name: 'Yizkor',
            nameHebrew: 'יזכור',
            prayers: [
              {
                name: 'Yizkor',
                nameHebrew: 'יזכור',
                reference: 'Siddur_Ashkenaz,_Yom_Kippur,_Day,_Yizkor,_Yizkor'
              }
            ]
          },
          {
            name: 'Neilah',
            nameHebrew: 'נעילה',
            prayers: [
              {
                name: 'Neilah Service',
                nameHebrew: 'תפילת נעילה',
                reference: 'Siddur_Ashkenaz,_Yom_Kippur,_Day,_Neilah,_Amidah,_Patriarchs'
              }
            ]
          }
        ]
      },
      {
        name: 'Sukkot',
        nameHebrew: 'סוכות',
        sections: [
          {
            name: 'Festival Prayers',
            nameHebrew: 'תפילות החג',
            prayers: [
              {
                name: 'Sukkot Amidah',
                nameHebrew: 'עמידה לסוכות',
                reference: 'Siddur_Ashkenaz,_Sukkot,_First_Day,_Shacharit,_Amidah,_Patriarchs'
              },
              {
                name: 'Hallel',
                nameHebrew: 'הלל',
                reference: 'Siddur_Ashkenaz,_Sukkot,_First_Day,_Hallel,_Hallel'
              },
              {
                name: 'Hoshanot',
                nameHebrew: 'הושענות',
                reference: 'Siddur_Ashkenaz,_Sukkot,_First_Day,_Hoshanot,_Hoshanot'
              }
            ]
          }
        ]
      },
      {
        name: 'Chanukah',
        nameHebrew: 'חנוכה',
        sections: [
          {
            name: 'Chanukah Prayers',
            nameHebrew: 'תפילות חנוכה',
            prayers: [
              {
                name: 'Al HaNissim',
                nameHebrew: 'על הניסים',
                reference: 'Siddur_Ashkenaz,_Weekday,_Shacharit,_Amidah,_Thanksgiving'
              },
              {
                name: 'Chanukah Candle Blessings',
                nameHebrew: 'ברכות נר חנוכה',
                reference: 'Siddur_Ashkenaz,_Chanukah,_Candle_Lighting,_Blessings'
              },
              {
                name: 'Hallel',
                nameHebrew: 'הלל',
                reference: 'Siddur_Ashkenaz,_Chanukah,_Hallel,_Hallel'
              }
            ]
          }
        ]
      },
      {
        name: 'Purim',
        nameHebrew: 'פורים',
        sections: [
          {
            name: 'Megillah Reading',
            nameHebrew: 'קריאת המגילה',
            prayers: [
              {
                name: 'Megillat Esther Blessings',
                nameHebrew: 'ברכות מגילת אסתר',
                reference: 'Siddur_Ashkenaz,_Purim,_Megillah_Reading,_Blessings'
              },
              {
                name: 'Al HaNissim',
                nameHebrew: 'על הניסים',
                reference: 'Siddur_Ashkenaz,_Purim,_Al_HaNissim'
              }
            ]
          }
        ]
      },
      {
        name: 'Passover',
        nameHebrew: 'פסח',
        sections: [
          {
            name: 'Festival Prayers',
            nameHebrew: 'תפילות החג',
            prayers: [
              {
                name: 'Passover Amidah',
                nameHebrew: 'עמידה לפסח',
                reference: 'Siddur_Ashkenaz,_Passover,_First_Day,_Shacharit,_Amidah,_Patriarchs'
              },
              {
                name: 'Hallel',
                nameHebrew: 'הלל',
                reference: 'Siddur_Ashkenaz,_Passover,_First_Day,_Hallel,_Hallel'
              }
            ]
          },
          {
            name: 'Counting the Omer',
            nameHebrew: 'ספירת העומר',
            prayers: [
              {
                name: 'Sefirat HaOmer',
                nameHebrew: 'ספירת העומר',
                reference: 'Siddur_Ashkenaz,_Passover,_Sefirat_HaOmer,_Blessing'
              }
            ]
          }
        ]
      },
      {
        name: 'Shavuot',
        nameHebrew: 'שבועות',
        sections: [
          {
            name: 'Festival Prayers',
            nameHebrew: 'תפילות החג',
            prayers: [
              {
                name: 'Shavuot Amidah',
                nameHebrew: 'עמידה לשבועות',
                reference: 'Siddur_Ashkenaz,_Shavuot,_First_Day,_Shacharit,_Amidah,_Patriarchs'
              },
              {
                name: 'Hallel',
                nameHebrew: 'הלל',
                reference: 'Siddur_Ashkenaz,_Shavuot,_First_Day,_Hallel,_Hallel'
              },
              {
                name: 'Akdamut',
                nameHebrew: 'אקדמות',
                reference: 'Siddur_Ashkenaz,_Shavuot,_First_Day,_Akdamut'
              }
            ]
          }
        ]
      },
      {
        name: 'Tisha B\'Av',
        nameHebrew: 'תשעה באב',
        sections: [
          {
            name: 'Fast Day Prayers',
            nameHebrew: 'תפילות יום צום',
            prayers: [
              {
                name: 'Eicha',
                nameHebrew: 'איכה',
                reference: 'Siddur_Ashkenaz,_Tisha_BAv,_Eicha'
              },
              {
                name: 'Kinot',
                nameHebrew: 'קינות',
                reference: 'Siddur_Ashkenaz,_Tisha_BAv,_Kinot'
              }
            ]
          }
        ]
      },
      {
        name: 'Berachot (Blessings)',
        nameHebrew: 'ברכות',
        sections: [
          {
            name: 'Birkat HaMazon',
            nameHebrew: 'ברכת המזון',
            prayers: [
              {
                name: 'Grace After Meals',
                nameHebrew: 'ברכת המזון',
                reference: 'Siddur_Ashkenaz,_Berachot,_Birkat_HaMazon'
              }
            ]
          },
          {
            name: 'Food Blessings',
            nameHebrew: 'ברכות הנהנין',
            prayers: [
              {
                name: 'Blessings on Food',
                nameHebrew: 'ברכות על המזון',
                reference: 'Siddur_Ashkenaz,_Berachot,_Birkat_Hanehenin'
              }
            ]
          },
          {
            name: 'Mitzvah Blessings',
            nameHebrew: 'ברכות המצוות',
            prayers: [
              {
                name: 'Blessings on Mitzvot',
                nameHebrew: 'ברכות המצוות',
                reference: 'Siddur_Ashkenaz,_Berachot,_Birkhot_Hamitzvot'
              }
            ]
          },
          {
            name: 'Special Occasions',
            nameHebrew: 'ברכות מיוחדות',
            prayers: [
              {
                name: 'Birkat HaLevana',
                nameHebrew: 'ברכת הלבנה',
                reference: 'Siddur_Ashkenaz,_Berachot,_Birkat_HaLevana'
              },
              {
                name: 'Traveler\'s Prayer',
                nameHebrew: 'תפילת הדרך',
                reference: 'Siddur_Ashkenaz,_Berachot,_Tefilat_HaDerech'
              }
            ]
          }
        ]
      },
      {
        name: 'Kaddish',
        nameHebrew: 'קדיש',
        sections: [
          {
            name: 'Kaddish Variations',
            nameHebrew: 'נוסחאות הקדיש',
            prayers: [
              {
                name: 'Half Kaddish',
                nameHebrew: 'חצי קדיש',
                reference: 'Siddur_Ashkenaz,_Kaddish,_Half_Kaddish'
              },
              {
                name: 'Full Kaddish',
                nameHebrew: 'קדיש שלם',
                reference: 'Siddur_Ashkenaz,_Kaddish,_Full_Kaddish'
              },
              {
                name: 'Mourner\'s Kaddish',
                nameHebrew: 'קדיש יתום',
                reference: 'Siddur_Ashkenaz,_Kaddish,_Mourners_Kaddish'
              },
              {
                name: 'Kaddish DeRabbanan',
                nameHebrew: 'קדיש דרבנן',
                reference: 'Siddur_Ashkenaz,_Kaddish,_Kaddish_DeRabbanan'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'Sefard',
    nameHebrew: 'ספרד',
    services: [
      {
        name: 'Weekday Shacharit',
        nameHebrew: 'שחרית של חול',
        sections: [
          {
            name: 'Upon Arising',
            nameHebrew: 'בהקיצו',
            prayers: [
              {
                name: 'Modeh Ani',
                nameHebrew: 'מודה אני',
                reference: 'Siddur_Sefard,_Upon_Arising,_Modeh_Ani'
              },
              {
                name: 'Netilat Yadayim',
                nameHebrew: 'נטילת ידיים',
                reference: 'Siddur_Sefard,_Upon_Arising,_Netilat_Yadayim'
              },
              {
                name: 'Asher Yatzar',
                nameHebrew: 'אשר יצר',
                reference: 'Siddur_Sefard,_Upon_Arising,_Asher_Yatzar'
              },
              {
                name: 'Elohai Neshama',
                nameHebrew: 'אלהי נשמה',
                reference: 'Siddur_Sefard,_Upon_Arising,_Elohai_Neshama'
              }
            ]
          },
          {
            name: 'Morning Blessings',
            nameHebrew: 'ברכות השחר',
            prayers: [
              {
                name: 'Blessings on Torah',
                nameHebrew: 'ברכות התורה',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Blessings_on_Torah'
              },
              {
                name: 'Morning Prayer',
                nameHebrew: 'תפילת השחר',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Morning_Prayer'
              },
              {
                name: 'Korbanot',
                nameHebrew: 'קרבנות',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Korbanot'
              }
            ]
          },
          {
            name: 'Pesukei Dezimra',
            nameHebrew: 'פסוקי דזמרה',
            prayers: [
              {
                name: 'Hodu',
                nameHebrew: 'הודו',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Hodu'
              },
              {
                name: 'Baruch SheAmar',
                nameHebrew: 'ברוך שאמר',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Baruch_SheAmar'
              },
              {
                name: 'Ashrei',
                nameHebrew: 'אשרי',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Ashrei'
              },
              {
                name: 'Yishtabach',
                nameHebrew: 'ישתבח',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Yishtabach'
              }
            ]
          },
          {
            name: 'Shema and Its Blessings',
            nameHebrew: 'קריאת שמע וברכותיה',
            prayers: [
              {
                name: 'The Shema',
                nameHebrew: 'קריאת שמע',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_The_Shema'
              }
            ]
          },
          {
            name: 'Amidah',
            nameHebrew: 'עמידה',
            prayers: [
              {
                name: 'Amidah',
                nameHebrew: 'עמידה',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Amidah'
              },
              {
                name: 'Tachanun',
                nameHebrew: 'תחנון',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Tachanun'
              }
            ]
          },
          {
            name: 'Concluding Prayers',
            nameHebrew: 'סיום תפילה',
            prayers: [
              {
                name: 'Ashrei',
                nameHebrew: 'אשרי',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Ashrei_2'
              },
              {
                name: 'Aleinu',
                nameHebrew: 'עלינו',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Aleinu'
              },
              {
                name: 'Song of the Day',
                nameHebrew: 'שיר של יום',
                reference: 'Siddur_Sefard,_Weekday,_Shacharit,_Song_of_the_Day'
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
            name: 'Minchah Service',
            nameHebrew: 'תפילת מנחה',
            prayers: [
              {
                name: 'Ashrei',
                nameHebrew: 'אשרי',
                reference: 'Siddur_Sefard,_Weekday,_Mincha,_Ashrei'
              },
              {
                name: 'Amidah',
                nameHebrew: 'עמידה',
                reference: 'Siddur_Sefard,_Weekday,_Mincha,_Amidah'
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
            name: 'Maariv Service',
            nameHebrew: 'תפילת ערבית',
            prayers: [
              {
                name: 'Shema',
                nameHebrew: 'שמע',
                reference: 'Siddur_Sefard,_Weekday,_Maariv,_Shema'
              },
              {
                name: 'Amidah',
                nameHebrew: 'עמידה',
                reference: 'Siddur_Sefard,_Weekday,_Maariv,_Amidah'
              },
              {
                name: 'Aleinu',
                nameHebrew: 'עלינו',
                reference: 'Siddur_Sefard,_Weekday,_Maariv,_Aleinu'
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
            name: 'Kabbalat Shabbat',
            nameHebrew: 'קבלת שבת',
            prayers: [
              {
                name: 'Lecha Dodi',
                nameHebrew: 'לכה דודי',
                reference: 'Siddur_Sefard,_Shabbat,_Kabbalat_Shabbat,_Lecha_Dodi'
              },
              {
                name: 'Psalms for Kabbalat Shabbat',
                nameHebrew: 'מזמורים לקבלת שבת',
                reference: 'Siddur_Sefard,_Shabbat,_Kabbalat_Shabbat,_Psalms'
              }
            ]
          },
          {
            name: 'Shabbat Evening',
            nameHebrew: 'ערבית לשבת',
            prayers: [
              {
                name: 'Maariv',
                nameHebrew: 'ערבית',
                reference: 'Siddur_Sefard,_Shabbat,_Evening,_Maariv'
              },
              {
                name: 'Kiddush',
                nameHebrew: 'קידוש',
                reference: 'Siddur_Sefard,_Shabbat,_Evening,_Kiddush'
              }
            ]
          },
          {
            name: 'Shabbat Morning',
            nameHebrew: 'שחרית לשבת',
            prayers: [
              {
                name: 'Nishmat',
                nameHebrew: 'נשמת',
                reference: 'Siddur_Sefard,_Shabbat,_Shacharit,_Nishmat'
              },
              {
                name: 'Amidah',
                nameHebrew: 'עמידה',
                reference: 'Siddur_Sefard,_Shabbat,_Shacharit,_Amidah'
              }
            ]
          }
        ]
      },
      {
        name: 'Rosh Chodesh',
        nameHebrew: 'ראש חודש',
        sections: [
          {
            name: 'Prayers',
            nameHebrew: 'תפילות',
            prayers: [
              {
                name: 'Hallel',
                nameHebrew: 'הלל',
                reference: 'Siddur_Sefard,_Rosh_Chodesh,_Hallel'
              },
              {
                name: 'Musaf',
                nameHebrew: 'מוסף',
                reference: 'Siddur_Sefard,_Rosh_Chodesh,_Musaf'
              }
            ]
          }
        ]
      },
      {
        name: 'Holidays',
        nameHebrew: 'חגים',
        sections: [
          {
            name: 'Festival Prayers',
            nameHebrew: 'תפילות החגים',
            prayers: [
              {
                name: 'Hallel',
                nameHebrew: 'הלל',
                reference: 'Siddur_Sefard,_Festivals,_Hallel'
              },
              {
                name: 'Musaf',
                nameHebrew: 'מוסף',
                reference: 'Siddur_Sefard,_Festivals,_Musaf'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'Edot HaMizrach',
    nameHebrew: 'עדות המזרח',
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
                reference: 'Siddur_Edot_HaMizrach,_Preparatory_Prayers,_Modeh_Ani'
              },
              {
                name: 'Morning Blessings',
                nameHebrew: 'ברכות השחר',
                reference: 'Siddur_Edot_HaMizrach,_Preparatory_Prayers,_Morning_Blessings'
              },
              {
                name: 'Torah Blessings',
                nameHebrew: 'ברכות התורה',
                reference: 'Siddur_Edot_HaMizrach,_Preparatory_Prayers,_Torah_Blessings'
              }
            ]
          },
          {
            name: 'Shacharit',
            nameHebrew: 'שחרית',
            prayers: [
              {
                name: 'Hodu',
                nameHebrew: 'הודו',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Hodu'
              },
              {
                name: 'Baruch SheAmar',
                nameHebrew: 'ברוך שאמר',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Baruch_SheAmar'
              },
              {
                name: 'Ashrei',
                nameHebrew: 'אשרי',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Ashrei'
              },
              {
                name: 'Yishtabach',
                nameHebrew: 'ישתבח',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Yishtabach'
              },
              {
                name: 'Shema',
                nameHebrew: 'שמע',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Shema'
              },
              {
                name: 'Amidah',
                nameHebrew: 'עמידה',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Amidah'
              },
              {
                name: 'Tachanun',
                nameHebrew: 'תחנון',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Tachanun'
              }
            ]
          }
        ]
      },
      {
        name: 'Weekday Mincha',
        nameHebrew: 'מנחה של חול',
        sections: [
          {
            name: 'Mincha',
            nameHebrew: 'מנחה',
            prayers: [
              {
                name: 'Ashrei',
                nameHebrew: 'אשרי',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Mincha,_Ashrei'
              },
              {
                name: 'Amidah',
                nameHebrew: 'עמידה',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Mincha,_Amidah'
              }
            ]
          }
        ]
      },
      {
        name: 'Weekday Arvit',
        nameHebrew: 'ערבית של חול',
        sections: [
          {
            name: 'Arvit',
            nameHebrew: 'ערבית',
            prayers: [
              {
                name: 'Shema',
                nameHebrew: 'שמע',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Arvit,_Shema'
              },
              {
                name: 'Amidah',
                nameHebrew: 'עמידה',
                reference: 'Siddur_Edot_HaMizrach,_Weekday_Arvit,_Amidah'
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
            name: 'Kabbalat Shabbat',
            nameHebrew: 'קבלת שבת',
            prayers: [
              {
                name: 'Lecha Dodi',
                nameHebrew: 'לכה דודי',
                reference: 'Siddur_Edot_HaMizrach,_Shabbat,_Kabbalat_Shabbat,_Lecha_Dodi'
              }
            ]
          },
          {
            name: 'Shabbat Arvit',
            nameHebrew: 'ערבית לשבת',
            prayers: [
              {
                name: 'Arvit',
                nameHebrew: 'ערבית',
                reference: 'Siddur_Edot_HaMizrach,_Shabbat,_Shabbat_Arvit,_Arvit'
              }
            ]
          },
          {
            name: 'Shabbat Shacharit',
            nameHebrew: 'שחרית לשבת',
            prayers: [
              {
                name: 'Nishmat',
                nameHebrew: 'נשמת',
                reference: 'Siddur_Edot_HaMizrach,_Shabbat,_Shabbat_Shacharit,_Nishmat'
              },
              {
                name: 'Amidah',
                nameHebrew: 'עמידה',
                reference: 'Siddur_Edot_HaMizrach,_Shabbat,_Shabbat_Shacharit,_Amidah'
              }
            ]
          },
          {
            name: 'Shabbat Mussaf',
            nameHebrew: 'מוסף לשבת',
            prayers: [
              {
                name: 'Mussaf',
                nameHebrew: 'מוסף',
                reference: 'Siddur_Edot_HaMizrach,_Shabbat,_Shabbat_Mussaf,_Mussaf'
              }
            ]
          },
          {
            name: 'Shabbat Mincha',
            nameHebrew: 'מנחה לשבת',
            prayers: [
              {
                name: 'Mincha',
                nameHebrew: 'מנחה',
                reference: 'Siddur_Edot_HaMizrach,_Shabbat,_Shabbat_Mincha,_Mincha'
              }
            ]
          },
          {
            name: 'Havdalah',
            nameHebrew: 'הבדלה',
            prayers: [
              {
                name: 'Havdalah',
                nameHebrew: 'הבדלה',
                reference: 'Siddur_Edot_HaMizrach,_Shabbat,_Havdalah,_Havdalah'
              }
            ]
          }
        ]
      },
      {
        name: 'Rosh Hodesh',
        nameHebrew: 'ראש חודש',
        sections: [
          {
            name: 'Prayers',
            nameHebrew: 'תפילות',
            prayers: [
              {
                name: 'Hallel',
                nameHebrew: 'הלל',
                reference: 'Siddur_Edot_HaMizrach,_Rosh_Hodesh,_Hallel'
              }
            ]
          }
        ]
      },
      {
        name: 'Festivals',
        nameHebrew: 'חגים',
        sections: [
          {
            name: 'Three Festivals',
            nameHebrew: 'שלוש רגלים',
            prayers: [
              {
                name: 'Festival Amidah',
                nameHebrew: 'עמידה לחג',
                reference: 'Siddur_Edot_HaMizrach,_Three_Festivals,_Amidah'
              },
              {
                name: 'Hallel',
                nameHebrew: 'הלל',
                reference: 'Siddur_Edot_HaMizrach,_Three_Festivals,_Hallel'
              }
            ]
          }
        ]
      },
      {
        name: 'High Holidays',
        nameHebrew: 'ימים נוראים',
        sections: [
          {
            name: 'Special Prayers',
            nameHebrew: 'תפילות מיוחדות',
            prayers: [
              {
                name: 'Selichot',
                nameHebrew: 'סליחות',
                reference: 'Siddur_Edot_HaMizrach,_High_Holidays,_Selichot'
              }
            ]
          }
        ]
      }
    ]
  }
];
