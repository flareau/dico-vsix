import re

def ind0(s):
    return s + r'\d'

def ind1(s):
    return s + r'[1-9]'

def indopt(s):
    return s + r'([1-9α](\+[1-9])?)?'

def ind(s):
    return s + r'(\d|[1-9]+(\+[1-9]+)?)'

SIMPLE_LFS = [
    '\[Magn', 'Qual1\]',    # FIXME
    'f',                    # placeholder
    r"\{[^\{\}]+?\}",       # non standard LF
    'Q',
    'Syn',
    'Anti',
    'Non',
    r'Conv[1-9]{2,}',
    'Gener',
    'Figur',
    'Contr',
    'S0',
    'V0',
    'A0',
    'Adv0',
    'Claus',
    'Pred',
    ind1('S'),
    'Equip',
    'Cap',
    r'S_?(instr|med|mod|loc|res)',
    ind1('A'),
    ind1('Able'),
    ind1('Qual'),
    ind1('Adv'),
    'Sing',
    'Mult',
    'Imper',
    'Perf',
    'Imperf',
    ind1('Result'),
    'Germ',
    'Culm',
    'Epit',
    'Redun',
    'Magn',
    ind1('Magn'),
    '--quant',
    '--temp',
    'Ver',
    r'Bon2?',
    'Degrad',
    'Plus',
    'Minus',
    r'Loc_?(in|ad|ab)',
    'Instr',
    ind1('Propt'),
    'Copul',
    ind('Oper'),
    ind('Func'),
    r'Labor[1-9]{2}',
    ind('Real'),
    ind('Fact'),
    r'Labreal[1-9α]{2}',
    'Prepar',
    'Incep',
    'Fin',
    'Cont',
    'Prox',
    'Obstr',
    'Stop',
    'Excess',
    indopt('Caus'),
    indopt('Liqu'),
    indopt('Perm'),
    'Son',
    'Manif',
    'Involv',
    r'--Sympt[1-3]{2,3}'
]

def valid(string):
    lfs = sum([lf.split('+') for lf in string.split('/')], [])
    return all([bool(re.match(rf"^({'|'.join(SIMPLE_LFS)})+$", lf.strip())) for lf in lfs])
