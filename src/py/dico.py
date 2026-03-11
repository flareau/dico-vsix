import re
from . import semviz
from . import lf
from graphviz import Digraph
from collections import Counter
import unicodedata as uc

VARIABLES = 'XYZABC'
COLORS = ['dodgerblue4', 'green4', 'darkorange4', 'darkorchid4', 'aquamarine3', 'brown']
INDENT = '  '
SECTIONS = ['REM', 'EX', 'DEF', 'SEM', 'TR', 'FL']
ANNOTATIONS = {
    'error': '!',
    'comment': '*',
    'invalid': '-',
    'missing': '+',
    'example': '.' # works as a modifier for ! and *
}
SELF = '~'
FULL_PENALTY = 3


def is_var(text):
    regex = r'^[' + VARIABLES + r']\d*$'
    if re.match(regex, text):
        return True
    else:
        return False

def remove_dups(seq):
    clean = []
    for item in seq:
       if item not in clean:
           clean.append(item)
    return clean

def general_lf(lf):
    lf = re.sub(r'(V|S|A|Adv)0', r'\1ø', lf)
    lf = re.sub(r'(S|A|Adv)[\d\+]+', r'\1i', lf)
    lf = re.sub(r'[α\d+](\+\d+)*', '', lf)
    lf = re.sub(r'[øØ]', '0', lf)
    lf = re.sub(r'_', '', lf)
    lf = re.sub(r"Magn\^'\w+'", r'Magn', lf)
    lf = re.sub(r'^Q([^u])', r'\1', lf)
    lf = re.sub(r'\+Q([^u])', r'+\1', lf)
    lf = re.sub(r"^\{.+\}$", r'fonction non standard', lf)
    return lf

def strip_para(val):
    return re.match('(@?)(.+)', val).group(2)

def safe(text):
    # text = text.lower()
    # text = re.sub(r'[áàâäãåā]', 'a', text)
    # text = re.sub(r'[éèêëęėē]', 'e', text)
    # text = re.sub(r'[íìîïīį]', 'i', text)
    # text = re.sub(r'[óòôöõōø]', 'o', text)
    # text = re.sub(r'[úùûüū]', 'u', text)
    # text = re.sub(r'[çćč]', 'c', text)
    # text = re.sub(r'[ñń]', 'n', text)
    # text = re.sub(r'æ', 'ae', text)
    # text = re.sub(r'œ', 'oe', text)
    text = re.sub(r'[ \'’]', '_', text)
    text = re.sub(r'[\$\%\&…\.,;:"“”«»\!\?]', '', text)
    return text


class Annotated():

    def __init__(self, depth):
        self.annotations = []
        self.depth = depth

    def annotate(self, string):
        a = Annotation(string, self.depth+1)
        if a.target == 'item':
            self.annotations.append(a)
        elif a.target == 'ex':
            if hasattr(self, 'examples') and self.examples:
                self.examples[-1].annotations.append(a)
            else:
                self.example.annotations.append(a)

    def penalty(self):
        pen = sum([a.penalty for a in self.annotations])
        if getattr(self, 'status', None) == 'invalid':
            pen += FULL_PENALTY
        return pen

    def __str__(self):
        if self.annotations:
            return '\n' + '\n'.join([str(a) for a in self.annotations])
        else:
            return ''


class Annotation:

    def __init__(self, string, depth):
        bang, ex, text = re.match(r'^(\*|!+)(\.?)\s*(.+)$', string).groups()
        if bang == '*':
            bang = ''
        if ex:
            self.target = 'ex'
        else:
            self.target = 'item'
        self.penalty = len(bang)
        self.text = text.strip()
        self.depth = depth

    def __str__(self):
        string = INDENT * self.depth
        if self.penalty:
            string += self.penalty * '!'
        else:
            string += '*'
        if self.target == 'ex':
            string += '.'
        string +=  ' ' + self.text
        return string


class Example(Annotated):
    regex = re.compile(r'^([\+\-]\s*)?"(.+?)"\s*(\(\s*(http.+?|inventé)\s*\))?$', re.IGNORECASE)

    def __init__(self, string, depth):
        super().__init__(depth)
        m = Example.regex.match(string)
        status = m.group(1)
        if status:
            if status.strip() == '+':
                self.status = 'missing'
            elif status.strip() == '-':
                self.status = 'invalid'
        else:
            self.status = 'valid'
        self.text = m.group(2).strip()
        source = m.group(4)
        web = False
        if source:
            source = source.strip()
            if source.startswith('http'):
                web = True
        else:
            source = None
        self.source = source
        self.web = web

    def __str__(self):
        indent = INDENT * self.depth
        if self.status == 'missing':
            indent = indent[:-2] + '+ '
        elif self.status == 'invalid':
            indent = indent[:-2] + '- '
        string = indent + '"' + self.text + '"'
        if self.source:
            string += ' (' + self.source + ')'
        else:
            string += ' (SOURCE?)'
        return string + super().__str__()


class Examplified(Annotated):

    EX_PADDING = 40

    def __init__(self, string, depth):
        self.examples = []
        self.example = None
        item, example, source = re.match(r'^(.+?)\s*(".*?"\s*(\(.+?\))?)?$', string).groups()
        if example:
            self.add_example(Example(example, 0))
        self.string = item.strip()
        super().__init__(depth)

    def add_example(self, example):
        self.examples.append(example)
        self.example = self.examples[0]

    def __str__(self):
        if self.examples:
            string = ('\n' + ' ' * self.EX_PADDING).join([str(ex) for ex in self.examples])
        else:
            string = ''
        return string + super().__str__()

class LexicalFunction(Examplified):

    def __init__(self, string, depth):
        super().__init__(string, depth)
        status, fn, _, gp_pre, val, gp_post = re.match(r"^([\+\-]\s*)?((\w+ *: *)?[\w/\+\s\'\-\[\]α~\^\{\}]+?) *= *(\[[~ \w'\-#=\.\+]+\])? *(@? *[\w#\-' ~]+?) *(\[[~ \w'\-#=\.\+]+\])?$", self.string, re.U).groups()
        fn = re.sub(r' *([\+:/]) *', r'\1', fn) # remove spaces around / + :
        assert lf.valid(fn)
        if status:
            if status.strip() == '+':
                self.status = 'missing'
            elif status.strip() == '-':
                self.status = 'invalid'
        else:
            self.status = 'valid'
        self.fn = fn
        self.val = val
        self.gp = (gp_pre, gp_post)

    def __str__(self):
        indent = INDENT*self.depth
        if self.status == 'missing':
            indent = indent[:-2] + '+ '
        elif self.status == 'invalid':
            indent = indent[:-2] + '- '
        if self.gp[0]:
            gp_pre = f"{self.gp[0]} "
        else:
            gp_pre = ''
        if self.gp[1]:
            gp_post = f" {self.gp[1]}"
        else:
            gp_post = ''
        return f"{indent}{self.fn} = {gp_pre}{self.val}{gp_post}".ljust(Examplified.EX_PADDING) + super().__str__()


class Features(Annotated):

    def __init__(self, string, depth):
        super().__init__(depth)
        self.text = re.match(r"^[\w\d ,\.\-\(\)\';~#]+$", string, re.U).string.strip()

    def __str__(self):
        string = INDENT*self.depth + self.text
        return string + super().__str__()


class GovernmentPattern(Examplified):

    def __init__(self, string, depth):
        super().__init__(string, depth)
        status, text = re.match(r"^([\+\-]\s*)?(.+)$", self.string).groups()
        if status:
            if status.strip() == '+':
                self.status = 'missing'
            elif status.strip() == '-':
                self.status = 'invalid'
        else:
            self.status = 'valid'
        self.text = re.match(r"^[\w\s~=\.,\'\-\+\(\)\[\]\{\}/]+$", text, re.U).string.strip()

    def __str__(self):
        indent = INDENT*self.depth
        if self.status == 'missing':
            indent = indent[:-2] + '+ '
        elif self.status == 'invalid':
            indent = indent[:-2] + '- '
        string = indent + self.text
        return string.ljust(Examplified.EX_PADDING) + super().__str__()


class FormalDefinition(Annotated):

    def __init__(self, string, depth):
        super().__init__(depth)
        definiendum, definiens, _, conditions = re.match(r"^([\w\d_\-'\(\)#,\s]+)\s*=\s*([\w\d_\-'\(\)#,\s\&:]+)(\s*\|\s*(.+))?$", string, re.U).groups()
        definiendum_graph = semviz.parse(definiendum)[0]
        definiens_graph = semviz.parse(definiens)[0]
        self.arity = len(definiendum_graph[0][2])
        self.definiendum = semviz.logform(definiendum_graph)
        self.definiens = semviz.logform(definiens_graph)
        if conditions:
            self.conditions = conditions.strip()
        else:
            self.conditions = None

    def __str__(self):
        string = INDENT*self.depth + f"{self.definiendum} = {self.definiens}"
        if self.conditions:
            string += f" | {self.conditions}"
        return string + super().__str__()


class TextDefinition(Annotated):

    def __init__(self, string, depth):
        super().__init__(depth)
        try:
            definiendum, definiens = re.match(r"^(.+) *= *(.+)$", string).groups()
        except:
            definiendum = string
            definiens = '...'
        self.definiendum = definiendum.strip()
        self.definiens = definiens.strip()

    def __str__(self):
        string = INDENT*self.depth + f"{self.definiendum} = {self.definiens}"
        return string + super().__str__()

class Headline(Annotated):

    def __init__(self, string):
        super().__init__(0)
        spelling, phon = re.match(r"^([\w\-' ]+?)\s+/\s*([A-Za-z0-9:@~\.\(\)_\\ ']+)\s*/$", string, re.U).groups()
        self.spelling = spelling.strip()
        self.phon = re.sub(r'\s+', '', phon).strip()

    def __str__(self):
        string = INDENT*self.depth + f'{self.spelling} /{self.phon}/'
        return string + super().__str__()


class Vocable:

    def __init__(self, indent=True):
        self.headline = None
        self.name = None
        self.spelling = None
        self.phon = None
        self.REM = None
        self.lex = {}
        self.indent = indent

    def __str__(self):
        string = str(self.headline) + '\n'
        string += str(self.REM) + '\n'
        string += ''.join([str(lex) for num,lex in sorted(self.lex.items(), key=lambda item: item[0])])
        return string

    def clean_lines(self, lines):
        clean = []
        comments = []
        for i, line in lines:
            line = re.sub(r'\s+', ' ', line).strip()  # canonize whitespace
            line = line.replace('∼', '~')             # canonize ~ # TODO: bypass in strict mode
            line = line.replace(r'\"', '<PROTECTED:ESCAPED-QUOTE>') # protect \"
            line = line.replace(r'\(', '<PROTECTED:ESCAPED-OPEN-PAREN>') # protect \(
            line = line.replace(r'\)', '<PROTECTED:ESCAPED-CLOSE-PAREN>') # protect \)
            line = line.replace(r'\%', '<PROTECTED:ESCAPED-PERCENT>') # protect \%
            # protect % in quoted text
            m = re.search(r'("[^"]+?")', line)
            if m:
                quoted = m.group(1)
                line = line.replace(quoted, quoted.replace('%', '<PROTECTED:PERCENT>'))
            # protect % in URLs
            # TODO: protect " in URLs
            m = re.search(r'\(\s*(https?://\S+)\s*\)', line)
            if m:
                url = m.group(1)
                line = line.replace(url, url.replace('%', '<PROTECTED:PERCENT>'))
            # remove comments
            # TODO: save comments and restore them when exporting
            m = re.match(r'^(.*?)(%(.*))?$', line)
            if m:
                line = (m.group(1) or '').strip()
                comment = (m.group(3) or '').strip()
                if comment:
                    comments.append((i, comment))
            # process line if not empty without comments
            if line:
                # restore protected characters
                line = line.replace('<PROTECTED:ESCAPED-QUOTE>', r'\"')
                line = line.replace('<PROTECTED:ESCAPED-OPEN-PAREN>', r'\(')
                line = line.replace('<PROTECTED:ESCAPED-CLOSE-PAREN>', r'\)')
                line = line.replace('<PROTECTED:ESCAPED-PERCENT>', r'\%')
                line = line.replace('<PROTECTED:PERCENT>', '%')
                # split lines with run-in section title: REM pluriel => REM \n pluriel
                regex = r'^(' + '|'.join(SECTIONS) + r')\s+(.+)$'
                m = re.match(regex, line)
                if m:
                    section = m.group(1).upper()
                    content = m.group(2)
                    clean.append((i+.1, section))
                    clean.append((i+.2, content))
                else:
                    clean.append((i, line))
                # split lines with sense number followed by section: 1. EX => 1. \n EX
                regex = r'^(\d+)\. *(' + '|'.join(SECTIONS) + r')$'
                m = re.match(regex, line)
                if m:
                    num = m.group(1)
                    section = m.group(2).upper()
                    clean.append((i+.1, num))
                    clean.append((i+.2, section))
                # FIXME: will mess up sublines if there is info after the section start: 1. EX "example" (source)
        clean.reverse()
        return clean, comments

    def expanded(self, string, lex, num=True):
        string = re.sub(SELF+'#', lex.voc.name+'#', string)
        if num:
            string = re.sub(SELF, lex.voc.name+'#'+str(lex.num), string)
        else:
            string = re.sub(SELF, lex.voc.name, string)
        return string

    def from_file(self, filename, log=False):
        vocname = filename.split('/')[-1].split('.')[0]
        self.name = uc.normalize('NFC',vocname)
        # print(f'  {filename} ({self.name})')
        with open(filename, 'r') as f:
            lines, comments = self.clean_lines(enumerate(f.readlines(), 1))
            if log:
                print(f'Commentaires ignorés dans {filename}:')
                print('  '+('\n  '.join([f'{i}: {comment}' for i, comment in comments])))

        lex = None
        state = 'headline'
        prev = None
        depth = 0

        while lines:
            i, line = lines.pop()

            # Annotations
            if line[0] in ['!', '*']:
                try:
                    assert prev != None
                except:
                    raise Exception(f"[{filename}, ligne {i}] Il n'y a rien à annoter ici")
                try:
                    prev.annotate(line)
                except:
                    raise Exception(f"[{filename}, ligne {i}] Annotation illisible")
                continue

            # Parse vocable's name and phonological form
            elif state == 'headline':
                try:
                    headline = Headline(line)
                    prev = headline
                    self.headline = headline
                    self.spelling = headline.spelling
                    self.phon = headline.phon
                except:
                    raise Exception(f"[{filename}, ligne {i}] Format attendu: lemme /lEm/  (API en format X-SAMPA)")
                state = 'voc_rem'

            # Parse vocable's grammatical features
            elif state == 'voc_rem':
                try:
                    features = Features(line, depth)
                    prev = features
                    self.REM = features
                except:
                    raise Exception(f"[{filename}, ligne {i}] Attendu: caractéristiques grammaticales. Caractères permis: A-Z 0-9 (),.;'-~#")
                state = 'lex'

            # Parse lexical unit
            elif state == 'lex':
                try:
                    num = int(re.match(r"^(\d+)\.$", line).group(1))
                except:
                    raise Exception(f"[{filename}, ligne {i}] Attendu: début d'une lexie")
                if num in self.lex.keys():
                    raise Exception(f"[{filename}, ligne {i}] Il y a déjà une entrée #{num}")
                # TODO: don't ignore sequence in strict mode
                # elif num != len(self.lex) + 1:
                #     raise Exception(f"[{filename}, ligne {i}] Numéro attendu: {len(self.lex) + 1}.")
                else:
                    depth += 1
                    lex = Lexie(self, num, depth)
                    prev = None # annotations not allowed at the beginning of a lexie
                    self.lex[num] = lex
                state = 'section'

            # Parse section
            elif state == 'section':
                try:
                    regex = r'^(' + '|'.join(SECTIONS) + r')$'
                    section = re.match(regex, line).group(1) # TODO: don't ignore case in strict mode
                except:
                    raise Exception(f"[{filename}, ligne {i}] Attendu: début d'une section ({', '.join(SECTIONS)})")
                if not lex:
                    raise Exception(f"[{filename}, ligne {i}] Aucune lexie active")
                if lex.__dict__[section]:
                    raise Exception(f"[{filename}, ligne {i}] Cette section est déjà définie pour cette lexie")
                depth += 1
                state = section
                prev = None # annotations not allowed at the beginning of a section

            # Exiting a section
            elif state == 'exit':
                if re.match(r"^\d+\.$", line):
                    lines.append((i, line))
                    state = 'lex'
                    depth -= 2
                    continue
                elif line in SECTIONS:
                    lines.append((i, line))
                    state = 'section'
                    depth -= 1
                    continue
                else:
                    raise Exception(f"[{filename}, ligne {i}] Attendu: début de lexie ou de section")

            # Hitting new section or lexical unit exits current section
            elif line in SECTIONS or re.match(r"^\d+\.$", line):
                lines.append((i, line))
                state = 'exit'
                continue

            # Remaining states are sections

            # Parse REM section
            elif state == 'REM':
                try:
                    features = Features(line, depth+1)
                    prev = features
                    lex.REM = features
                except:
                    raise Exception(f"[{filename}, ligne {i}] Caractères permis: A-Z 0-9 (),.;'-")
                state = 'exit'

            # Parse EX section
            elif state == 'EX':
                try:
                    ex = Example(line, depth+1)
                    prev = ex
                    lex.EX.append(ex)
                except:
                    raise Exception(f"[{filename}, ligne {i}] Format attendu: exemple (source)")

            # Parse DEF section
            elif state == 'DEF':
                try:
                    text_df = TextDefinition(line, depth+1)
                    # text_df = TextDefinition(self.expanded(line, lex), depth+1)
                    prev = text_df
                    lex.DEF = text_df
                except:
                    raise Exception(f"[{filename}, ligne {i}] Format attendu: definiendum = definiens")
                state = 'exit'

            # Parse SEM section
            elif state == 'SEM':
                try:
                    formal_df = FormalDefinition(line, depth+1)
                    prev = formal_df
                    lex.SEM = formal_df
                    lex.arity = formal_df.arity
                except:
                    raise Exception(f"[{filename}, ligne {i}] Format attendu: p(X,Y) = q(X,Y) & i:r(q)...")
                state = 'exit'

            # Parse TR section
            elif state == 'TR':
                if Example.regex.match(line):
                    if not lex.TR:
                        raise Exception(f"[{filename}, ligne {i}] Exemple sans item TR actif")
                    ex = Example(line, 0)
                    lex.TR[-1].add_example(ex)
                    prev = lex.TR[-1]
                else:
                    try:
                        gp = GovernmentPattern(line, depth+1)
                        prev = gp
                        lex.TR.append(gp)
                    except:
                        raise Exception(f"[{filename}, ligne {i}] Attendu: schéma de régime. Caractères permis: A-Z ~=.,'-+()/")

            # Parse FL section
            elif state == 'FL':
                if Example.regex.match(line):
                    if not lex.FL:
                        raise Exception(f"[{filename}, ligne {i}] Exemple sans item FL actif")
                    ex = Example(line, 0)
                    lex.FL[-1].add_example(ex)
                    prev = lex.FL[-1]
                else:
                    try:
                        lf = LexicalFunction(line, depth+1)
                        prev = lf
                        lex.FL.append(lf)
                    except:
                        raise Exception(f"[{filename}, ligne {i}] Attendu: fonction = valeur [régime]")

            # There are no other states, raise an exception if you get here
            else:
                raise Exception(f"[{filename}, ligne {i}] Erreur du programme, état imprévu: {state}")

    def to_file(self, filename, preamble=None):
        with open(filename, 'w') as f:
            if preamble:
                f.write(preamble + '\n\n')
            f.write(str(self))

    def penalty(self):
        penalties = Counter({
            'headline': self.headline.penalty(),
            'rem': self.REM.penalty()
        })
        for lex in self.lex.values():
            penalties = penalties + lex.penalty()
        return penalties


class Lexie:

    def __init__(self, voc, num, depth):
        self.voc = voc
        self.num = num
        self.name = '#'.join((voc.name, str(num)))
        self.REM = None
        self.EX = []
        self.DEF = None  #.def is reserved
        self.SEM = None
        self.TR = []
        self.FL = []
        self.arity = None
        self.depth = depth

    def __str__(self):
        text = INDENT*(self.depth) + f'{self.num}.\n'

        if self.REM:
            text += INDENT*(self.depth+1) + 'REM\n'
            text += str(self.REM) + '\n'

        if self.EX:
            text += INDENT*(self.depth+1) + 'EX\n'
            text += '\n'.join([str(ex) for ex in self.EX]) + '\n'

        if self.DEF:
            text += INDENT*(self.depth+1) + 'DEF\n'
            text += str(self.DEF) + '\n'

        if self.SEM:
            text += INDENT*(self.depth+1) + 'SEM\n'
            text += str(self.SEM) + '\n'

        if self.TR:
            text += INDENT*(self.depth+1) + 'TR\n'
            text += '\n'.join([str(gp) for gp in self.TR]) + '\n'

        if self.FL:
            text += INDENT*(self.depth+1) + 'FL\n'
            text += '\n'.join([str(lf) for lf in self.FL]) + '\n'

        return text

    def includes(self):
        if self.SEM:
            nodes = semviz.parse(self.SEM.definiens)[0]
            includes = remove_dups([node[1] for node in nodes if not is_var(node[1])])
            # includes = remove_dups(['/'.join((node[1], str(len(node[2])))) for node in nodes if not is_var(node[1])])
        else:
            includes = []
        return includes

    def penalty(self):
        penalties = Counter()
        # Single-object sections
        single = {'REM': self.REM, 'DEF': self.DEF, 'SEM': self.SEM}
        # Multiple-object sections
        multi = {'EX': self.EX, 'FL': self.FL, 'TR': self.TR}
        obj_ex = 0
        for section in single:
            obj = single[section]
            if obj:
                penalties[section] = obj.penalty()
                if isinstance(obj, Examplified):
                    obj_ex += sum([ex.penalty() for ex in obj.examples])
        for section in multi:
            objs = multi[section]
            if objs:
                penalties[section] = sum([obj.penalty() for obj in objs])
                for obj in objs:
                    if isinstance(obj, Examplified):
                        obj_ex += sum([ex.penalty() for ex in obj.examples])
        penalties['EX'] += obj_ex
        return penalties

    def get_examples(self, sections=['EX', 'TR', 'FL']):
        if isinstance(sections, str):
            sections = [sections]
        examples = []
        for section in sections:
            if section == 'EX':
                examples += [ex for ex in self.EX if ex.status!='missing']
            elif section == 'TR':
                examples += [ex for gp in self.TR if gp.status!='missing' for ex in gp.examples]
            elif section == 'FL':
                examples += [ex for lf in self.FL if lf.status!='missing' for ex in lf.examples]
            else:
                pass
        return examples

    def get_example_sources(self, sections=['EX', 'TR', 'FL']):
        return [ex.source for ex in self.get_examples(sections)]

    def get_example_texts(self, sections=['EX', 'TR', 'FL']):
        return [ex.text for ex in self.get_examples(sections)]


class Lexicon:

    def __init__(self):
        self.vocables = []
        self.lexies = []

    def __str__(self):
        return '\n'.join([str(v) for v in self.vocables])

    def from_files(self, files, log=False):
        for file in files:
            voc = Vocable()
            voc.from_file(file, log)
            self.vocables.append(voc)
            self.lexies += voc.lex.values()

    def export_inclusions(self, file):
        graph = Digraph(engine='dot')
        graph.attr('graph', margin='0')
        # graph.attr('graph', ranksep='0.3')
        graph.attr('graph', nodesep='0.5')
        # graph.attr('graph', overlap='false')
        graph.attr('graph', splines='curved')
        graph.attr('node', shape='plaintext')
        graph.attr('edge', arrowhead='vee')
        lexs = [lex.name for voc in self.vocables for lex in voc.lex.values()]
        # print(lexs)
        for i, voc in enumerate(self.vocables):
            inclusions = {lex.name: lex.includes() for lex in voc.lex.values()}
            # print(inclusions)
            for lex, components in inclusions.items():
                graph.node(lex, fontcolor=COLORS[i])
                dominant = True
                synonym = (len(components)==1)
                # print(lex, synonym)
                for comp in components:
                    # print(comp)
                    if synonym:
                        if comp in lexs:
                            # print('renvoi')
                            color = 'dodgerblue1'
                            width = '2'
                            style = 'dotted'
                        else:
                            # print('synonyme')
                            color = 'red'
                            width = '3'
                            style = 'solid'
                    elif dominant:
                        color = 'black'
                        width = '2'
                        style = 'solid'
                    else:
                        color = 'gray'
                        style = 'solid'
                        if comp in lexs:
                            width = '1'
                        else:
                            width = '0.2'
                    if comp not in lexs:
                        graph.node(comp, fontcolor=color, fontsize='10')
                    graph.edge(lex, comp, color=color, penwidth=width, style=style)
                    dominant = False
        with open(file, 'wb') as f:
            f.write(graph.pipe())

    def export_lexrels(self, file):
        graph = Digraph(engine='neato')
        graph.attr('graph', margin='0')
        # graph.attr('graph', ranksep='1')
        graph.attr('graph', nodesep='0.5')
        graph.attr('graph', overlap='false')
        graph.attr('graph', splines='curved')
        graph.attr('node', shape='plaintext')
        graph.attr('edge', arrowhead='vee')
        graph.attr('edge', arrowsize='0.2')
        graph.attr('edge', fontsize='8')
        nodes = set()
        for i, voc in enumerate(self.vocables):
            # cluster = Digraph(name=f'cluster_{voc.name}')
            # cluster.attr('graph', bgcolor='gray96')
            # cluster.attr('graph', style='rounded')
            # cluster.attr('graph', color='gray80')
            # cluster.attr('graph', penwidth='0.5')
            for lex in voc.lex.values():
                keyword = lex.name
                nodes.add(keyword)
                if '#' in keyword:
                    kw, n = keyword.split('#')
                    label = f'{kw}<sub>{n}</sub>'
                else:
                    label = keyword
                graph.node(keyword, label=f'<<b>{label}</b>>', fontcolor=COLORS[i])
                # graph.node(keyword, fontcolor=COLORS[i])
                # cluster.node(lex.name, fontcolor='blue')
                for lf in lex.FL:
                    val = strip_para(lf.val)
                    if '#' in val:
                        val_voc, n = val.split('#')
                        val_label = f'<{val_voc}<sub>{n}</sub>>'
                    else:
                        val_label = val
                    label=lf.fn
                    color = 'gray70'
                    nodecolor = 'black'
                    style = 'solid'
                    # if label in ['V0', 'S0', 'A0', 'Adv0']:
                    #     color = 'blue3'
                    if lf.penalty() > 0:
                        color = 'lightpink'
                    if lf.status == 'missing':
                        color = 'plum'
                        # style = 'dashed'
                    if val not in nodes:
                        graph.node(val, label=val_label, fontcolor=nodecolor)
                    graph.edge(keyword, val, label=label, color=color, style=style, fontcolor=color)
            # graph.subgraph(cluster)
        with open(file, 'wb') as f:
            f.write(graph.pipe())
        # with open(file.replace('.pdf', '.dot'), 'w') as f:    # DEBUG
        #     f.write(graph.source)

    def export_defs(self, dir, text=False):
        for lex in self.lexies:
            if text and lex.DEF:
                label=str(lex.DEF.definiendum + ' = ' + lex.DEF.definiens)
            else:
                label=None
            if lex.SEM:
                pdf = semviz.layout(semviz.graphviz(semviz.parse('='.join([lex.SEM.definiendum, lex.SEM.definiens])), label=label))
                file = f'{dir}/{safe(lex.voc.name)}_df{lex.num}.pdf'
                with open(file, 'wb') as f:
                    f.write(pdf)

    def lexfns_stats(self):
        lfs = sum([lex.FL for lex in self.lexies], [])
        missing = [lf for lf in lfs if lf.status=='missing']
        lfs = [lf for lf in lfs if lf.status!='missing']
        fns, vals = zip(*[(lf.fn, lf.val) for lf in lfs])
        nlfs = len(lfs)
        npara = len([val for val in vals if val.startswith('@')])
        nsynt = nlfs - npara
        fns = sorted(set([general_lf(f) for f in fns]))
        vals = sorted(set([re.sub(r'_(n|v|a|adj|adv)$', r' (\1)', strip_para(v).lower()).replace('_', ' ') for v in vals]))
        # TODO: add more POS and fix case
        return nlfs, npara, nsynt, fns, vals, len(missing)

    def penalty(self):
        penalties = Counter()
        for voc in self.vocables:
            penalties = penalties + voc.penalty()
        return penalties


def test(files, inclusions=None, defs=None, lexfns=None):
    lexicon = Lexicon()
    lexicon.from_files(files)
    if inclusions:
        lexicon.export_inclusions(file=inclusions)
    if defs:
        lexicon.export_defs(dir=defs)
    if lexfns:
        lexicon.export_lexrels(file=lexfns)
