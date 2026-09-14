/**
 * Reference data lifted from the workbook — 'Lookup Tables' sheet of
 * Research-Costing-and-Pricing-Tool-v4.4.1.xlsm. Regenerate rather than hand-edit.
 */

export interface OrgUnit {
  department: string
  deptCode: string
  school: string
  schoolCode: string
  faculty: string
  facultyCode: string
}

/** tb_Org_Units — the Department dropdown, and what each department resolves to. */
export const ORG_UNITS: OrgUnit[] = [
  { department: "Faculty of Architecture, Building and Planning (D)", deptCode: "CCH_H1_5_24", school: "Faculty of Architecture, Building and Planning (S)", schoolCode: "CCH_H1_4_11", faculty: "Faculty of Architecture, Building and Planning", facultyCode: "CCH_H1_3_04" },
  { department: "Faculty of Architecture, Building and Planning - Admin", deptCode: "CCH_H1_5_22", school: "Faculty of Architecture, Building and Planning, Admin, Centres and Institute", schoolCode: "CCH_H1_4_10", faculty: "Faculty of Architecture, Building and Planning", facultyCode: "CCH_H1_3_04" },
  { department: "Faculty of Architecture, Building and Planning - Centres and Institutes", deptCode: "CCH_H1_5_23", school: "Faculty of Architecture, Building and Planning, Admin, Centres and Institute", schoolCode: "CCH_H1_4_10", faculty: "Faculty of Architecture, Building and Planning", facultyCode: "CCH_H1_3_04" },
  { department: "Asia Institute - Centres and Institutes", deptCode: "CCH_H1_5_199", school: "Asia Institute", schoolCode: "CCH_H1_4_02", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "Asia Institute (D)", deptCode: "CCH_H1_5_03", school: "Asia Institute", schoolCode: "CCH_H1_4_02", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "Faculty of Arts - Admin", deptCode: "CCH_H1_5_01", school: "Faculty of Arts, Admin, Centres and Institute", schoolCode: "CCH_H1_4_01", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "Faculty of Arts - Centres and Institutes", deptCode: "CCH_H1_5_02", school: "Faculty of Arts, Admin, Centres and Institute", schoolCode: "CCH_H1_4_01", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "Robert Cripps Institute for Cultural Conservation", deptCode: "CCH_H1_5_208", school: "Faculty of Arts, Admin, Centres and Institute", schoolCode: "CCH_H1_4_01", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "Graduate School of Humanities and Social Sciences (D)", deptCode: "CCH_H1_5_04", school: "Graduate School of Humanities and Social Sciences", schoolCode: "CCH_H1_4_03", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "School of Culture and Communication (D)", deptCode: "CCH_H1_5_05", school: "School of Culture and Communication", schoolCode: "CCH_H1_4_04", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "School of Historical and Philosophical Studies (D)", deptCode: "CCH_H1_5_06", school: "School of Historical and Philosophical Studies", schoolCode: "CCH_H1_4_05", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "School of Languages and Linguistics - Centres and Institutes", deptCode: "CCH_H1_5_200", school: "School of Languages and Linguistics", schoolCode: "CCH_H1_4_06", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "School of Languages and Linguistics (D)", deptCode: "CCH_H1_5_07", school: "School of Languages and Linguistics", schoolCode: "CCH_H1_4_06", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "School of Social and Political Sciences - Centres and Institutes", deptCode: "CCH_H1_5_201", school: "School of Social and Political Sciences", schoolCode: "CCH_H1_4_07", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "School of Social and Political Sciences (D)", deptCode: "CCH_H1_5_08", school: "School of Social and Political Sciences", schoolCode: "CCH_H1_4_07", faculty: "Faculty of Arts", facultyCode: "CCH_H1_3_01" },
  { department: "Department of Accounting", deptCode: "CCH_H1_5_28", school: "Faculty of Business and Economics (S)", schoolCode: "CCH_H1_4_14", faculty: "Faculty of Business and Economics", facultyCode: "CCH_H1_3_05" },
  { department: "Department of Business Administration", deptCode: "CCH_H1_5_29", school: "Faculty of Business and Economics (S)", schoolCode: "CCH_H1_4_14", faculty: "Faculty of Business and Economics", facultyCode: "CCH_H1_3_05" },
  { department: "Department of Economics", deptCode: "CCH_H1_5_30", school: "Faculty of Business and Economics (S)", schoolCode: "CCH_H1_4_14", faculty: "Faculty of Business and Economics", facultyCode: "CCH_H1_3_05" },
  { department: "Department of Finance", deptCode: "CCH_H1_5_31", school: "Faculty of Business and Economics (S)", schoolCode: "CCH_H1_4_14", faculty: "Faculty of Business and Economics", facultyCode: "CCH_H1_3_05" },
  { department: "Department of Management and Marketing", deptCode: "CCH_H1_5_32", school: "Faculty of Business and Economics (S)", schoolCode: "CCH_H1_4_14", faculty: "Faculty of Business and Economics", facultyCode: "CCH_H1_3_05" },
  { department: "Melbourne Institute of Applied Economic and Social Research", deptCode: "CCH_H1_5_215", school: "Faculty of Business and Economics (S)", schoolCode: "CCH_H1_4_14", faculty: "Faculty of Business and Economics", facultyCode: "CCH_H1_3_05" },
  { department: "Faculty of Business and Economics - Admin", deptCode: "CCH_H1_5_26", school: "Faculty of Business and Economics, Admin, Centres and Institute", schoolCode: "CCH_H1_4_13", faculty: "Faculty of Business and Economics", facultyCode: "CCH_H1_3_05" },
  { department: "Faculty of Business and Economics - Centres and Institutes", deptCode: "CCH_H1_5_27", school: "Faculty of Business and Economics, Admin, Centres and Institute", schoolCode: "CCH_H1_4_13", faculty: "Faculty of Business and Economics", facultyCode: "CCH_H1_3_05" },
  { department: "Faculty of Education (D)", deptCode: "CCH_H1_5_113", school: "Faculty of Education (S)", schoolCode: "CCH_H1_4_39", faculty: "Faculty of Education", facultyCode: "CCH_H1_3_09" },
  { department: "Faculty of Education - Admin", deptCode: "CCH_H1_5_111", school: "Faculty of Education, Admin, Centres and Institute", schoolCode: "CCH_H1_4_38", faculty: "Faculty of Education", facultyCode: "CCH_H1_3_09" },
  { department: "Faculty of Education - Centres and Institutes", deptCode: "CCH_H1_5_112", school: "Faculty of Education, Admin, Centres and Institute", schoolCode: "CCH_H1_4_38", faculty: "Faculty of Education", facultyCode: "CCH_H1_3_09" },
  { department: "Faculty of Engineering and Information Technology \u2013 Admin", deptCode: "CCH_H1_5_35", school: "Faculty of Engineering and Information Technology, Admin, Centres and Institute", schoolCode: "CCH_H1_4_17", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "Faculty of Engineering and Information Technology - Centres and Institutes", deptCode: "CCH_H1_5_36", school: "Faculty of Engineering and Information Technology, Admin, Centres and Institute", schoolCode: "CCH_H1_4_17", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "Department of Biomedical Engineering", deptCode: "CCH_H1_5_37", school: "School of Chemical and Biomedical Engineering", schoolCode: "CCH_H1_4_18", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "Department of Chemical Engineering", deptCode: "CCH_H1_5_38", school: "School of Chemical and Biomedical Engineering", schoolCode: "CCH_H1_4_18", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "School of Chemical and Biomedical Engineering (D)", deptCode: "CCH_H1_5_197", school: "School of Chemical and Biomedical Engineering", schoolCode: "CCH_H1_4_18", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "School of Computing and Information Systems (D)", deptCode: "CCH_H1_5_39", school: "School of Computing and Information Systems", schoolCode: "CCH_H1_4_19", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "Department of Electrical and Electronic Engineering", deptCode: "CCH_H1_5_41", school: "School of Electrical, Mechanical and Infrastructure Engineering", schoolCode: "CCH_H1_4_20", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "Department of Infrastructure Engineering", deptCode: "CCH_H1_5_42", school: "School of Electrical, Mechanical and Infrastructure Engineering", schoolCode: "CCH_H1_4_20", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "Department of Mechanical Engineering", deptCode: "CCH_H1_5_43", school: "School of Electrical, Mechanical and Infrastructure Engineering", schoolCode: "CCH_H1_4_20", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "School of Electrical, Mechanical and Infrastructure Eng (D)", deptCode: "CCH_H1_5_40", school: "School of Electrical, Mechanical and Infrastructure Engineering", schoolCode: "CCH_H1_4_20", faculty: "Faculty of Engineering and Information Technology", facultyCode: "CCH_H1_3_06" },
  { department: "Melbourne Conservatorium of Music", deptCode: "CCH_H1_5_46", school: "Faculty of Fine Arts and Music (S)", schoolCode: "CCH_H1_4_22", faculty: "Faculty of Fine Arts and Music", facultyCode: "CCH_H1_3_07" },
  { department: "Victorian College of the Arts", deptCode: "CCH_H1_5_47", school: "Faculty of Fine Arts and Music (S)", schoolCode: "CCH_H1_4_22", faculty: "Faculty of Fine Arts and Music", facultyCode: "CCH_H1_3_07" },
  { department: "Faculty of Fine Arts and Music - Admin", deptCode: "CCH_H1_5_44", school: "Faculty of Fine Arts and Music, Admin, Centres and Institute", schoolCode: "CCH_H1_4_21", faculty: "Faculty of Fine Arts and Music", facultyCode: "CCH_H1_3_07" },
  { department: "Faculty of Medicine, Dentistry and Health Sciences - Admin (D)", deptCode: "CCH_H1_5_48", school: "Faculty of Medicine, Dentistry and Health Sciences - Admin", schoolCode: "CCH_H1_4_23", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Australian Biocommons", deptCode: "CCH_H1_5_62", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Centre for Cancer Research", deptCode: "CCH_H1_5_49", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Centre for Collaborative Practice", deptCode: "CCH_H1_5_50", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Centre for Digital Transformation of Health", deptCode: "CCH_H1_5_51", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Centre for Youth Mental Health (Orygen)", deptCode: "CCH_H1_5_52", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Clinical Research Support (MISCH)", deptCode: "CCH_H1_5_206", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Comprehensive Dementia Centre", deptCode: "CCH_H1_5_53", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Medical Biology (WEHI)", deptCode: "CCH_H1_5_54", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Florey Department of Neuroscience and Mental Health", deptCode: "CCH_H1_5_55", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Medical Bionics Department", deptCode: "CCH_H1_5_56", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne Academic Centre for Health (MACH)", deptCode: "CCH_H1_5_207", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne Academy of Surgical Anatomy (MDHS)", deptCode: "CCH_H1_5_204", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne Bioinformatics (VLSCI)", deptCode: "CCH_H1_5_57", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne Poche Centre for Indigenous Health", deptCode: "CCH_H1_5_60", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne Teaching Health Clinics", deptCode: "CCH_H1_5_205", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "National Ageing Research Institute", deptCode: "CCH_H1_5_61", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "The Peter Doherty Institute for Infection and Immunity", deptCode: "CCH_H1_5_09", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "The Sir Peter MacCallum Department of Oncology", deptCode: "CCH_H1_5_63", school: "MDHS Centres and Institutes", schoolCode: "CCH_H1_4_08", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne Dental School (D)", deptCode: "CCH_H1_5_65", school: "Melbourne Dental School", schoolCode: "CCH_H1_4_24", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Baker Department of Cardiometabolic Health", deptCode: "CCH_H1_5_69", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Clinical Pathology", deptCode: "CCH_H1_5_70", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Critical Care", deptCode: "CCH_H1_5_71", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of General Practice and Primary Care", deptCode: "CCH_H1_5_72", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Infectious Diseases", deptCode: "CCH_H1_5_73", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Medical Education", deptCode: "CCH_H1_5_74", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Medicine", deptCode: "CCH_H1_5_75", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Obstetrics, Gynaecology and Newborn Health", deptCode: "CCH_H1_5_76", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Paediatrics", deptCode: "CCH_H1_5_77", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Psychiatry", deptCode: "CCH_H1_5_78", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Radiology", deptCode: "CCH_H1_5_79", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Rural Health", deptCode: "CCH_H1_5_80", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Surgery", deptCode: "CCH_H1_5_81", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne Medical School - Admin", deptCode: "CCH_H1_5_66", school: "Melbourne Medical School", schoolCode: "CCH_H1_4_25", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Audiology and Speech Pathology", deptCode: "CCH_H1_5_83", school: "Melbourne School of Health Sciences", schoolCode: "CCH_H1_4_26", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Nursing", deptCode: "CCH_H1_5_84", school: "Melbourne School of Health Sciences", schoolCode: "CCH_H1_4_26", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Optometry and Vision Sciences", deptCode: "CCH_H1_5_85", school: "Melbourne School of Health Sciences", schoolCode: "CCH_H1_4_26", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Physiotherapy", deptCode: "CCH_H1_5_86", school: "Melbourne School of Health Sciences", schoolCode: "CCH_H1_4_26", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Social Work", deptCode: "CCH_H1_5_87", school: "Melbourne School of Health Sciences", schoolCode: "CCH_H1_4_26", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne School of Health Sciences - Admin", deptCode: "CCH_H1_5_82", school: "Melbourne School of Health Sciences", schoolCode: "CCH_H1_4_26", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne School of Population and Global Health - Centres and Institutes", deptCode: "CCH_H1_5_89", school: "Melbourne School of Population and Global Health", schoolCode: "CCH_H1_4_27", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne School of Population and Global Health (D)", deptCode: "CCH_H1_5_88", school: "Melbourne School of Population and Global Health", schoolCode: "CCH_H1_4_27", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne School of Psychological Sciences - Centres and Institutes", deptCode: "CCH_H1_5_91", school: "Melbourne School of Psychological Sciences", schoolCode: "CCH_H1_4_28", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Melbourne School of Psychological Sciences (D)", deptCode: "CCH_H1_5_90", school: "Melbourne School of Psychological Sciences", schoolCode: "CCH_H1_4_28", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Anatomy and Physiology", deptCode: "CCH_H1_5_93", school: "School of Biomedical Sciences", schoolCode: "CCH_H1_4_29", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Biochemistry and Pharmacology", deptCode: "CCH_H1_5_94", school: "School of Biomedical Sciences", schoolCode: "CCH_H1_4_29", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Department of Microbiology and Immunology", deptCode: "CCH_H1_5_95", school: "School of Biomedical Sciences", schoolCode: "CCH_H1_4_29", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "School of Biomedical Sciences - Admin", deptCode: "CCH_H1_5_92", school: "School of Biomedical Sciences", schoolCode: "CCH_H1_4_29", faculty: "Faculty of Medicine, Dentistry and Health Sciences", facultyCode: "CCH_H1_3_02" },
  { department: "Faculty of Science - Admin", deptCode: "CCH_H1_5_96", school: "Faculty of Science, Admin, Centres and Institute", schoolCode: "CCH_H1_4_30", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "Faculty of Science - Centres and Institutes", deptCode: "CCH_H1_5_97", school: "Faculty of Science, Admin, Centres and Institute", schoolCode: "CCH_H1_4_30", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "Melbourne Veterinary School - Centres and Institutes", deptCode: "CCH_H1_5_110", school: "Melbourne Veterinary School", schoolCode: "CCH_H1_4_37", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "Melbourne Veterinary School (D)", deptCode: "CCH_H1_5_109", school: "Melbourne Veterinary School", schoolCode: "CCH_H1_4_37", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of Agriculture, Food and Ecosystem Sciences (D)", deptCode: "CCH_H1_5_98", school: "School of Agriculture, Food and Ecosystem Sciences", schoolCode: "CCH_H1_4_31", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of BioSciences - Centres and Institutes", deptCode: "CCH_H1_5_100", school: "School of BioSciences", schoolCode: "CCH_H1_4_32", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of BioSciences (D)", deptCode: "CCH_H1_5_99", school: "School of BioSciences", schoolCode: "CCH_H1_4_32", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of Chemistry - Centres and Institutes", deptCode: "CCH_H1_5_102", school: "School of Chemistry", schoolCode: "CCH_H1_4_33", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of Chemistry (D)", deptCode: "CCH_H1_5_101", school: "School of Chemistry", schoolCode: "CCH_H1_4_33", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of Geography, Earth and Atmospheric Sciences - Centres and Institutes", deptCode: "CCH_H1_5_104", school: "School of Geography, Earth and Atmospheric Sciences", schoolCode: "CCH_H1_4_34", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of Geography, Earth and Atmospheric Sciences (D)", deptCode: "CCH_H1_5_103", school: "School of Geography, Earth and Atmospheric Sciences", schoolCode: "CCH_H1_4_34", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of Mathematics and Statistics - Centres and Institutes", deptCode: "CCH_H1_5_106", school: "School of Mathematics and Statistics", schoolCode: "CCH_H1_4_35", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of Mathematics and Statistics (D)", deptCode: "CCH_H1_5_105", school: "School of Mathematics and Statistics", schoolCode: "CCH_H1_4_35", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of Physics - Centres and Institutes", deptCode: "CCH_H1_5_108", school: "School of Physics", schoolCode: "CCH_H1_4_36", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "School of Physics (D)", deptCode: "CCH_H1_5_107", school: "School of Physics", schoolCode: "CCH_H1_4_36", faculty: "Faculty of Science", facultyCode: "CCH_H1_3_08" },
  { department: "Advancement", deptCode: "CCH_H1_5_119", school: "Advancement, Communications & Marketing", schoolCode: "CCH_H1_4_42", faculty: "Advancement, Communications & Marketing", facultyCode: "CCH_H1_3_11" },
  { department: "Communications and Marketing", deptCode: "CCH_H1_5_120", school: "Advancement, Communications & Marketing", schoolCode: "CCH_H1_4_42", faculty: "Advancement, Communications & Marketing", facultyCode: "CCH_H1_3_11" },
  { department: "Office of the VP Advancement", deptCode: "CCH_H1_5_118", school: "Advancement, Communications & Marketing", schoolCode: "CCH_H1_4_42", faculty: "Advancement, Communications & Marketing", facultyCode: "CCH_H1_3_11" },
  { department: "Ao Mo Da (Beijing) Consulting Co. Ltd (D)", deptCode: "CCH_H1_5_195", school: "Ao Mo Da (Beijing) Consulting Co. Ltd (S)", schoolCode: "CCH_H1_4_62", faculty: "Ao Mo Da (Beijing) Consulting Co. Ltd", facultyCode: "CCH_H1_3_24" },
  { department: "Corporate Finance, Property and Sustainability", deptCode: "CCH_H1_5_125", school: "Chief Financial Officer Group", schoolCode: "CCH_H1_4_44", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Financial Planning, Partnering and Advisory", deptCode: "CCH_H1_5_126", school: "Chief Financial Officer Group", schoolCode: "CCH_H1_4_44", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Funding Policy Planning", deptCode: "CCH_H1_5_219", school: "Chief Financial Officer Group", schoolCode: "CCH_H1_4_44", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Office of the CFO", deptCode: "CCH_H1_5_124", school: "Chief Financial Officer Group", schoolCode: "CCH_H1_4_44", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Procurement", deptCode: "CCH_H1_5_127", school: "Chief Financial Officer Group", schoolCode: "CCH_H1_4_44", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Strategic Financial Initiatives", deptCode: "CCH_H1_5_128", school: "Chief Financial Officer Group", schoolCode: "CCH_H1_4_44", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Strategy, Planning and Performance", deptCode: "CCH_H1_5_123", school: "Chief Financial Officer Group", schoolCode: "CCH_H1_4_44", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Academic Technology", deptCode: "CCH_H1_5_12", school: "Chief Information Officer Group", schoolCode: "CCH_H1_4_09", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Cybersecurity", deptCode: "CCH_H1_5_20", school: "Chief Information Officer Group", schoolCode: "CCH_H1_4_09", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Enterprise Technology", deptCode: "CCH_H1_5_15", school: "Chief Information Officer Group", schoolCode: "CCH_H1_4_09", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Office of the CIO", deptCode: "CCH_H1_5_10", school: "Chief Information Officer Group", schoolCode: "CCH_H1_4_09", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Planning & Assurance", deptCode: "CCH_H1_5_19", school: "Chief Information Officer Group", schoolCode: "CCH_H1_4_09", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Research Computing Services", deptCode: "CCH_H1_5_17", school: "Chief Information Officer Group", schoolCode: "CCH_H1_4_09", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Chief People Officer", deptCode: "CCH_H1_5_210", school: "Chief People Officer", schoolCode: "CCH_H1_4_64", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Commercial Management", deptCode: "CCH_H1_5_217", school: "Corporate Development", schoolCode: "CCH_H1_4_65", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Corporate Development Directorate", deptCode: "CCH_H1_5_211", school: "Corporate Development", schoolCode: "CCH_H1_4_65", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Infrastructure", deptCode: "CCH_H1_5_212", school: "Corporate Development", schoolCode: "CCH_H1_4_65", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Stakeholder Relations and Engagement", deptCode: "CCH_H1_5_218", school: "Corporate Development", schoolCode: "CCH_H1_4_65", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Sustainability", deptCode: "CCH_H1_5_213", school: "Corporate Development", schoolCode: "CCH_H1_4_65", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Campus Management", deptCode: "CCH_H1_5_18", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Change Practice (EPG)", deptCode: "CCH_H1_5_135", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Client Services", deptCode: "CCH_H1_5_11", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Enterprise Service Group Directorate", deptCode: "CCH_H1_5_133", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Finance Services", deptCode: "CCH_H1_5_14", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Health & Safety", deptCode: "CCH_H1_5_13", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "HR Services", deptCode: "CCH_H1_5_16", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Melbourne Bio-Resources", deptCode: "CCH_H1_5_21", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Projects and Portfolio Management", deptCode: "CCH_H1_5_138", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Service Experience & Design", deptCode: "CCH_H1_5_140", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "University Decision Support", deptCode: "CCH_H1_5_136", school: "Enterprise Service Group", schoolCode: "CCH_H1_4_46", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Information Governance Services", deptCode: "CCH_H1_5_130", school: "Legal and Risk", schoolCode: "CCH_H1_4_45", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Legal Services", deptCode: "CCH_H1_5_131", school: "Legal and Risk", schoolCode: "CCH_H1_4_45", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Office of General Counsel", deptCode: "CCH_H1_5_129", school: "Legal and Risk", schoolCode: "CCH_H1_4_45", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Risk and Assurance", deptCode: "CCH_H1_5_132", school: "Legal and Risk", schoolCode: "CCH_H1_4_45", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Governance", deptCode: "CCH_H1_5_122", school: "Office of the Chief Operating Officer", schoolCode: "CCH_H1_4_43", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Office of the Chief Operating Officer (D)", deptCode: "CCH_H1_5_121", school: "Office of the Chief Operating Officer", schoolCode: "CCH_H1_4_43", faculty: "Chief Operating Officer", facultyCode: "CCH_H1_3_03" },
  { department: "Melbourne Professional Education (MPE)", deptCode: "CCH_H1_5_34", school: "Deputy Vice-Chancellor Education (S)", schoolCode: "CCH_H1_4_67", faculty: "Deputy Vice-Chancellor Education", facultyCode: "CCH_H1_3_27" },
  { department: "Office of the DVC Education", deptCode: "CCH_H1_5_214", school: "Deputy Vice-Chancellor Education (S)", schoolCode: "CCH_H1_4_67", faculty: "Deputy Vice-Chancellor Education", facultyCode: "CCH_H1_3_27" },
  { department: "Future Students", deptCode: "CCH_H1_5_147", school: "Student and Scholarly Services", schoolCode: "CCH_H1_4_48", faculty: "Deputy Vice-Chancellor Education", facultyCode: "CCH_H1_3_27" },
  { department: "Scholarly Services", deptCode: "CCH_H1_5_151", school: "Student and Scholarly Services", schoolCode: "CCH_H1_4_48", faculty: "Deputy Vice-Chancellor Education", facultyCode: "CCH_H1_3_27" },
  { department: "Student Administration", deptCode: "CCH_H1_5_152", school: "Student and Scholarly Services", schoolCode: "CCH_H1_4_48", faculty: "Deputy Vice-Chancellor Education", facultyCode: "CCH_H1_3_27" },
  { department: "Student and Scholarly Services Directorate", deptCode: "CCH_H1_5_146", school: "Student and Scholarly Services", schoolCode: "CCH_H1_4_48", faculty: "Deputy Vice-Chancellor Education", facultyCode: "CCH_H1_3_27" },
  { department: "Student Success", deptCode: "CCH_H1_5_154", school: "Student and Scholarly Services", schoolCode: "CCH_H1_4_48", faculty: "Deputy Vice-Chancellor Education", facultyCode: "CCH_H1_3_27" },
  { department: "University Colleges and Residential Life", deptCode: "CCH_H1_5_150", school: "Student and Scholarly Services", schoolCode: "CCH_H1_4_48", faculty: "Deputy Vice-Chancellor Education", facultyCode: "CCH_H1_3_27" },
  { department: "Wellbeing Services", deptCode: "CCH_H1_5_216", school: "Student and Scholarly Services", schoolCode: "CCH_H1_4_48", faculty: "Deputy Vice-Chancellor Education", facultyCode: "CCH_H1_3_27" },
  { department: "Office of the DVC Indigenous", deptCode: "CCH_H1_5_171", school: "Deputy Vice-Chancellor Indigenous (S)", schoolCode: "CCH_H1_4_66", faculty: "Deputy Vice-Chancellor Indigenous", facultyCode: "CCH_H1_3_26" },
  { department: "Culture (GCE)", deptCode: "CCH_H1_5_203", school: "Global, Culture and Engagement (S)", schoolCode: "CCH_H1_4_49", faculty: "Global, Culture and Engagement", facultyCode: "CCH_H1_3_12" },
  { department: "Engagement (GCE)", deptCode: "CCH_H1_5_162", school: "Global, Culture and Engagement (S)", schoolCode: "CCH_H1_4_49", faculty: "Global, Culture and Engagement", facultyCode: "CCH_H1_3_12" },
  { department: "Global (GCE)", deptCode: "CCH_H1_5_202", school: "Global, Culture and Engagement (S)", schoolCode: "CCH_H1_4_49", faculty: "Global, Culture and Engagement", facultyCode: "CCH_H1_3_12" },
  { department: "Melbourne Theatre Company", deptCode: "CCH_H1_5_164", school: "Global, Culture and Engagement (S)", schoolCode: "CCH_H1_4_49", faculty: "Global, Culture and Engagement", facultyCode: "CCH_H1_3_12" },
  { department: "Office of the DVC Global, Culture and Engagement", deptCode: "CCH_H1_5_155", school: "Global, Culture and Engagement (S)", schoolCode: "CCH_H1_4_49", faculty: "Global, Culture and Engagement", facultyCode: "CCH_H1_3_12" },
  { department: "Melbourne Business School Limited Group (D)", deptCode: "CCH_H1_5_193", school: "Melbourne Business School Limited Group (S)", schoolCode: "CCH_H1_4_60", faculty: "Melbourne Business School Limited Group", facultyCode: "CCH_H1_3_22" },
  { department: "Melbourne Law School - Admin", deptCode: "CCH_H1_5_114", school: "Melbourne Law School (S)", schoolCode: "CCH_H1_4_40", faculty: "Melbourne Law School", facultyCode: "CCH_H1_3_10" },
  { department: "Melbourne Law School - Centres and Institutes", deptCode: "CCH_H1_5_115", school: "Melbourne Law School (S)", schoolCode: "CCH_H1_4_40", faculty: "Melbourne Law School", facultyCode: "CCH_H1_3_10" },
  { department: "Melbourne Law School (D)", deptCode: "CCH_H1_5_116", school: "Melbourne Law School (S)", schoolCode: "CCH_H1_4_40", faculty: "Melbourne Law School", facultyCode: "CCH_H1_3_10" },
  { department: "Nossal Institute Ltd (D)", deptCode: "CCH_H1_5_187", school: "Nossal Institute Ltd (S)", schoolCode: "CCH_H1_4_55", faculty: "Nossal Institute Ltd", facultyCode: "CCH_H1_3_17" },
  { department: "Melbourne Online", deptCode: "CCH_H1_5_198", school: "Melbourne Online", schoolCode: "CCH_H1_4_68", faculty: "Office of the Provost", facultyCode: "CCH_H1_3_13" },
  { department: "Office of the Provost (D)", deptCode: "CCH_H1_5_188", school: "Office of the Provost (S)", schoolCode: "CCH_H1_4_50", faculty: "Office of the Provost", facultyCode: "CCH_H1_3_13" },
  { department: "People and Community", deptCode: "CCH_H1_5_173", school: "Office of the Provost (S)", schoolCode: "CCH_H1_4_50", faculty: "Office of the Provost", facultyCode: "CCH_H1_3_13" },
  { department: "Office of the Vice-Chancellor (D)", deptCode: "CCH_H1_5_174", school: "Office of the Vice-Chancellor (S)", schoolCode: "CCH_H1_4_51", faculty: "Office of the Vice-Chancellor", facultyCode: "CCH_H1_3_14" },
  { department: "Atlantic Fellows for Social Equity", deptCode: "CCH_H1_5_176", school: "Atlantic Fellows for Social Equity", schoolCode: "CCH_H1_4_69", faculty: "Research & Enterprise", facultyCode: "CCH_H1_3_15" },
  { department: "Melbourne Connect", deptCode: "CCH_H1_5_178", school: "Melbourne Connect", schoolCode: "CCH_H1_4_70", faculty: "Research & Enterprise", facultyCode: "CCH_H1_3_15" },
  { department: "Melbourne National Security and Defence", deptCode: "CCH_H1_5_209", school: "Research & Enterprise (S)", schoolCode: "CCH_H1_4_52", faculty: "Research & Enterprise", facultyCode: "CCH_H1_3_15" },
  { department: "Office of the DVC Research", deptCode: "CCH_H1_5_175", school: "Research & Enterprise (S)", schoolCode: "CCH_H1_4_52", faculty: "Research & Enterprise", facultyCode: "CCH_H1_3_15" },
  { department: "Commercialisation Ventures", deptCode: "CCH_H1_5_142", school: "Research, Innovation and Commercialisation", schoolCode: "CCH_H1_4_47", faculty: "Research & Enterprise", facultyCode: "CCH_H1_3_15" },
  { department: "Innovation & Enterprise", deptCode: "CCH_H1_5_143", school: "Research, Innovation and Commercialisation", schoolCode: "CCH_H1_4_47", faculty: "Research & Enterprise", facultyCode: "CCH_H1_3_15" },
  { department: "Melbourne Entrepreneurial Centre (MEC)", deptCode: "CCH_H1_5_144", school: "Research, Innovation and Commercialisation", schoolCode: "CCH_H1_4_47", faculty: "Research & Enterprise", facultyCode: "CCH_H1_3_15" },
  { department: "Office of Research Management", deptCode: "CCH_H1_5_145", school: "Research, Innovation and Commercialisation", schoolCode: "CCH_H1_4_47", faculty: "Research & Enterprise", facultyCode: "CCH_H1_3_15" },
  { department: "RIC Directorate", deptCode: "CCH_H1_5_141", school: "Research, Innovation and Commercialisation", schoolCode: "CCH_H1_4_47", faculty: "Research & Enterprise", facultyCode: "CCH_H1_3_15" },
  { department: "UM Commercialisation Pty Ltd (D)", deptCode: "CCH_H1_5_189", school: "UM Commercialisation Pty Ltd (S)", schoolCode: "CCH_H1_4_56", faculty: "UM Commercialisation Pty Ltd", facultyCode: "CCH_H1_3_18" },
  { department: "UM Commercialisation Trust (D)", deptCode: "CCH_H1_5_190", school: "UM Commercialisation Trust (S)", schoolCode: "CCH_H1_4_57", faculty: "UM Commercialisation Trust", facultyCode: "CCH_H1_3_19" },
  { department: "UMELB (Singapore) (D)", deptCode: "CCH_H1_5_191", school: "UMELB (Singapore) (S)", schoolCode: "CCH_H1_4_58", faculty: "UMELB (Singapore)", facultyCode: "CCH_H1_3_20" },
  { department: "Unimelb Germany GmbH (D)", deptCode: "CCH_H1_5_196", school: "Unimelb Germany GmbH (S)", schoolCode: "CCH_H1_4_63", faculty: "Unimelb Germany GmbH", facultyCode: "CCH_H1_3_25" },
  { department: "Corporate", deptCode: "CCH_H1_5_184", school: "University Corporate", schoolCode: "CCH_H1_4_53", faculty: "University Central Reporting Group", facultyCode: "CCH_H1_3_16" },
  { department: "Service Recipients", deptCode: "CCH_H1_5_185", school: "University Corporate", schoolCode: "CCH_H1_4_53", faculty: "University Central Reporting Group", facultyCode: "CCH_H1_3_16" },
  { department: "UOM Commercial Ltd (D)", deptCode: "CCH_H1_5_192", school: "UOM Commercial Ltd (S)", schoolCode: "CCH_H1_4_59", faculty: "UOM Commercial Ltd", facultyCode: "CCH_H1_3_21" },
  { department: "UoM International Holdings Limited Group (D)", deptCode: "CCH_H1_5_194", school: "UoM International Holdings Limited Group (S)", schoolCode: "CCH_H1_4_61", faculty: "UoM International Holdings Limited Group", facultyCode: "CCH_H1_3_23" },
]

export const DEPARTMENTS = ORG_UNITS.map((u) => u.department)

export const ORG_UNIT_BY_DEPARTMENT: Record<string, OrgUnit> = Object.fromEntries(
  ORG_UNITS.map((u) => [u.department, u]),
)

export const FACULTIES = [...new Set(ORG_UNITS.map((u) => u.faculty))].sort()

/** Company is fixed in the workbook; the rest of the account string is looked up. */
export const COMPANY_CODE = "C001"

export const ACTIVITY_CODES: Record<string, string> = {
  "Research": "ACT_02",
  "Research Training": "ACT_03",
}

export const ACTIVITIES = Object.keys(ACTIVITY_CODES)

export const REGION_CODES: Record<string, string> = {
  "Parkville": "RE_001",
  "Creswick": "RE_002",
  "Werribee": "RE_003",
  "Burnley": "RE_004",
  "Dookie": "RE_005",
  "Southbank": "RE_006",
  "Fishermans Bend": "RE_007",
  "Victorian Comprehensive Cancer Centre": "RE_008",
  "Royal Women's Hospital": "RE_009",
  "St Vincent's Health": "RE_010",
  "Northern Health": "RE_011",
  "Western Health": "RE_012",
  "Mercy Public Hospitals": "RE_013",
  "Melbourne Health": "RE_014",
  "Royal Victorian Eye & Ear Hospital": "RE_015",
  "Austin Health": "RE_016",
  "Royal Children's Hospital": "RE_017",
  "Dental Health Services Victoria": "RE_018",
  "Rural Health Service": "RE_019",
  "Residential - Clinical": "RE_020",
  "Residential - Student Accommodation": "RE_021",
  "Portfolio - Special Crown Leases": "RE_022",
  "Portfolio - Bequests/Trust Properties": "RE_023",
  "Portfolio - Commercial": "RE_024",
  "Hawthorn": "RE_025",
  "Shepparton": "RE_026",
  "Ballarat": "RE_027",
  "Germany": "RE_028",
  "Singapore": "RE_029",
  "China": "RE_030",
}

export const REGIONS = Object.keys(REGION_CODES)

/** vl_project_attribute_string — company-costcentre-activity-region. */
export function accountString(department: string, activity: string, region: string) {
  const unit = ORG_UNIT_BY_DEPARTMENT[department]
  if (!unit) return ""
  return [COMPANY_CODE, unit.deptCode, ACTIVITY_CODES[activity] ?? "", REGION_CODES[region] ?? ""].join("-")
}

export interface NonStaffExpense {
  category: string
  expense: string
  ledgerId: string
}

/** vl_nonstaff_costs_subcategory — cost category, its expense types, and ledger IDs. */
export const NON_STAFF_EXPENSES: NonStaffExpense[] = [
  { category: "Advertising and marketing", expense: "Advertising, Marketing and Promotional Expenses", ledgerId: "5060" },
  { category: "Consumable Goods and Supplies", expense: "Library", ledgerId: "5061" },
  { category: "Consumable Goods and Supplies", expense: "Consumable Service", ledgerId: "5062" },
  { category: "Consumable Goods and Supplies", expense: "Consumable Goods", ledgerId: "5063" },
  { category: "Data Management", expense: "Computer Software and Services", ledgerId: "5101" },
  { category: "Equipment and maintenance and utilities", expense: "Property Plant and Equipment - Cost", ledgerId: "1640" },
  { category: "Equipment and maintenance and utilities", expense: "Minor Assets and Equipment (Asset < $10,000) Non-Capitalised Equipment", ledgerId: "5100" },
  { category: "Equipment and maintenance and utilities", expense: "Rental and Hire", ledgerId: "5201" },
  { category: "Equipment and maintenance and utilities", expense: "Repairs and Maintenance", ledgerId: "5220" },
  { category: "Expert Services and Consultants and Contractors", expense: "Consultants", ledgerId: "5040" },
  { category: "Expert Services and Consultants and Contractors", expense: "Contracted Services (ex. ICA)", ledgerId: "5041" },
  { category: "Expert Services and Consultants and Contractors", expense: "Other Expert Services", ledgerId: "5042" },
  { category: "Shared Grant Payments", expense: "Contributions to HEPS", ledgerId: "5181" },
  { category: "Shared Grant Payments", expense: "Other Grants", ledgerId: "5182" },
  { category: "Student Support", expense: "Scholarships", ledgerId: "5240" },
  { category: "Student Support", expense: "Other Student Support", ledgerId: "5241" },
  { category: "Travel and entertainment", expense: "Travel, Staff Development, and Conference Expense", ledgerId: "5260" },
  { category: "Travel and entertainment", expense: "Entertainment", ledgerId: "5261" },
]

export const COST_CATEGORIES = [...new Set(NON_STAFF_EXPENSES.map((e) => e.category))]

export const expensesFor = (category: string) =>
  NON_STAFF_EXPENSES.filter((e) => e.category === category).map((e) => e.expense)

export const ledgerIdFor = (category: string, expense: string) =>
  NON_STAFF_EXPENSES.find((e) => e.category === category && e.expense === expense)?.ledgerId ?? ""

/** dResearchType. Category 1 grants are exempt from the Dean's authorisation trigger. */
export const RESEARCH_TYPES = [
  "Grant Category 1",
  "Grant Non-Category 1",
  "Contract Research",
]

/** Justification_Options — reason for discounting or subsidising the project costs. */
export const JUSTIFICATION_OPTIONS = [
  "Faculty strategic reason",
  "Overheads not allowed by funder",
  "Some limited overheads allowed by funder; maximum applied",
  "Non-lead proposal; UoM aligned to lead organisation's pricing policy",
  "UoM negotiated rate (e.g. Department of Defence)",
  "Compliant with policy; full cost (or greater) recovered",
]

/** dDeliverableType — the workbook stores the code and shows the name. */
export const DELIVERABLE_TYPES: { code: string; label: string }[] = [
  { code: "EAUR", label: "External Audit Report" },
  { code: "FINR", label: "Financial Report" },
  { code: "INKD", label: "In Kind Report" },
  { code: "IAUR", label: "Internal Audit Report" },
  { code: "OVRN", label: "Overheads(non-invoicing)" },
  { code: "RINV", label: "Raise Invoice" },
  { code: "RIUS", label: "Raise Invoice for US Claims" },
  { code: "RCTI", label: "RCTI Income Due" },
  { code: "SHGP", label: "Shared Grant Expense Payment" },
  { code: "PRES", label: "Technical / Milestone Report" },
]

/** dCurrency. */
export const CURRENCIES = [
  "AUD - Australian Dollar",
  "BHD - Bahraini Dinar",
  "CAD - Canadian Dollar",
  "CHF - Swiss Franc",
  "CNY - Chinese Yuan",
  "DKK - Danish Krone",
  "EUR - Euro",
  "GBP - Pound Sterling",
  "HKD - Hong Kong Dollar",
  "IDR - Indonesian Rupiah",
  "INR - Indian Rupee",
  "JPY - Japanese Yen",
  "KRW - South Korean Won",
  "MYR - Malaysian Ringgit",
  "NOK - Norwegian Krona",
  "NZD - New Zealand Dollar",
  "SEK - Swedish Krona",
  "SGD - Singapore Dollar",
  "THB - Thai Baht",
  "TWD - New Taiwan Dollar",
  "USD - United States Dollar",
]

export interface RevenueCategory {
  party: string
  description: string
  ledgerId: string
}

/** lookup_revenue_categories — external party and the income ledger it books to. */
export const REVENUE_CATEGORIES: RevenueCategory[] = [
  { party: "NHMRC", description: "NHMRC", ledgerId: "4003" },
  { party: "ARC", description: "ARC", ledgerId: "4004" },
  { party: "Other", description: "State and Local Government Grants", ledgerId: "4020" },
  { party: "Other", description: "Contributions from Other Higher Education Providers", ledgerId: "4040" },
  { party: "Other", description: "Overseas Government Grants", ledgerId: "4041" },
  { party: "Other", description: "Non-Government Grants", ledgerId: "4042" },
  { party: "Other", description: "Consultancies and Contracts", ledgerId: "4060" },
]

export const EXTERNAL_PARTIES = [...new Set(REVENUE_CATEGORIES.map((r) => r.party))]

/** The sub-categories that apply when the external party is 'Other'. */
export const OTHER_PARTY_CATEGORIES = REVENUE_CATEGORIES.filter((r) => r.party === "Other").map(
  (r) => r.description,
)

/** tEBA — annual EBA increase by year. Salaries escalate by these compounded. */
export const EBA_INCREASE: Record<number, number> = {
  2025: 0,
  2026: 0.03,
  2027: 0.03,
  2028: 0.03,
  2029: 0.03,
  2030: 0.03,
  2031: 0.03,
  2032: 0.03,
  2033: 0.03,
  2034: 0.03,
  2035: 0.03,
  2036: 0.03,
  2037: 0.03,
  2038: 0.03,
  2039: 0.03,
  2040: 0.03,
  2041: 0.03,
  2042: 0.03,
  2043: 0.03,
}

export const YEARS = Object.keys(EBA_INCREASE).map(Number)

/** tcostmultiplier — minimum cost recovery multiplier by project start year. */
export const MIN_MULTIPLIER_BY_YEAR: Record<number, number> = {
  2024: 2.2,
  2025: 2.2,
  2026: 2.2,
  2027: 2.2,
  2028: 2.2,
  2029: 2.2,
  2030: 2.2,
}

/** tSalaryMax — top step within each classification family. */
export const SALARY_MAX_STEP: Record<string, number> = {
  "Level A": 8,
  "Level B": 6,
  "Level C": 6,
  "Level D": 4,
  "Level E": 1,
  "RA Grade 1": 3,
  "UOM 1": 3,
  "UOM 2": 3,
  "UOM 3": 6,
  "UOM 4": 4,
  "UOM 5": 8,
  "UOM 6": 5,
  "UOM 7": 5,
  "UOM 8": 5,
  "UOM 9": 3,
  "UOM 10": 1,
}
