/* global api, hash */
class Oxford {
    constructor(options) {
        this.token = '';
        this.gtk = '';
        this.options = options;
        this.maxexample = 2;
        this.word = '';
    }

    async displayName() {
        return 'Oxford 1';
    }


    setOptions(options) {
        this.options = options;
        this.maxexample = options.maxexample;
    }

    async getToken() {
        let homeurl = 'https://fanyi.baidu.com/';
        let homepage = await api.fetch(homeurl);
        let tmatch = /token: '(.+?)'/gi.exec(homepage);
        if (!tmatch || tmatch.length < 2) return null;
        let gmatch = /window.gtk = '(.+?)'/gi.exec(homepage);
        if (!gmatch || gmatch.length < 2) return null;
        return {
            'token': tmatch[1],
            'gtk': gmatch[1]
        };
    }

    async findTerm(word) {
        this.word = word;
        let deflection = await api.deinflect(word) || [];
        let promises = [word, deflection].map(x => this.findOxford(x));
        let results = await Promise.all(promises);
        return [].concat(...results).filter(x => x);
    }

    async findOxford(word) {
        // helper function
        function buildDefinitionBlock(exp, pos, defs) {
            if (!defs || !Array.isArray(defs) || defs.length < 0) return '';
            let definition = '';
            let sentence = '';
            let sentnum = 0;
            for (const def of defs) {
                if (def.text) definition += `<span class='tran'><span class='eng_tran'>${def.text}</span></span>`;
                if (def.tag == 'id' || def.tag == 'pv')
                    definition += def.enText ? `<div class="idmphrase">${def.enText}</div>` : '';
                //if (def.tag == 'xrs')
                //    definition += `<span class='tran'><span class='eng_tran'>${def.data[0].data[0].text}</span></span>`;
                if (def.tag == 'd' || def.tag == 'ud')
                    definition += pos + `<span class='tran'><span class='eng_tran'>${def.enText}</span></span>`;
                if (def.tag == 'x' && sentnum < maxexample) {
                    sentnum += 1;
                    let enText = def.enText.replace(RegExp(exp, 'gi'), `<b>${exp}</b>`);
                    sentence += `<br><span style="color:grey">» </span><span class='eng_sent'>${enText}</span>`;
                }
            }
            definition += sentence ? `${sentence}` : '';
            return definition;
        }
        const maxexample = this.maxexample;
        let notes = [];
        if (!word) return notes;
        let base = 'https://fanyi.baidu.com/v2transapi?from=en&to=zh&simple_means_flag=3';

        if (!this.token || !this.gtk) {
            let common = await this.getToken();
            if (!common) return [];
            this.token = common.token;
            this.gtk = common.gtk;
        }

        let sign = hash(word, this.gtk);
        if (!sign) return;

        let dicturl = base + `&query=${word}&sign=${sign}&token=${this.token}`;
        let data = '';
        try {
            data = JSON.parse(await api.fetch(dicturl));
            let oxford = getOxford(data);
            return [].concat(oxford);

        } catch (err) {
            return [];
        }

        function getOxford(data) {
            try {
                let simple = data.dict_result.simple_means;
                let expression = simple.word_name;
                if (!expression) return [];

                let symbols = simple.symbols[0];
                let reading_uk = symbols.ph_en || '';
                let reading_us = symbols.ph_am || '';
                let reading = reading_us ? `/${reading_us}/` : '';

                let audios = [];
                audios[0] = `https://fanyi.baidu.com/gettts?lan=uk&text=${encodeURIComponent(expression)}&spd=3&source=web`;
                audios[1] = `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(expression)}&spd=3&source=web`;

                let entries = data.dict_result.oxford.entry[0].data;
                if (!entries) return [];

                let definitions = [];
                for (const entry of entries) {
                    if (entry.tag == 'p-g' || entry.tag == 'h-g') {
                        let pos = '';
                        for (const group of entry.data) {
                            let definition = '';
                            if (group.tag == 'p') {
                                pos = `<span class='pos'>${group.p_text}</span>`;
                            }
                            if (group.tag == 'd') {
                                definition += pos + `<span class='tran'><span class='eng_tran'>${group.enText}</span></span>`;
                                definitions.push(definition);
                            }

                            if (group.tag == 'n-g') {
                                definition += buildDefinitionBlock(expression, pos, group.data);
                                definitions.push(definition);
                            }


                            //if (group.tag == 'xrs') {
                            //    definition += buildDefinitionBlock(pos, group.data[0].data);
                            //    definitions.push(definition);
                            //}

                            if (group.tag == 'sd-g' || group.tag == 'ids-g' || group.tag == 'pvs-g') {
                                for (const item of group.data) {
                                    if (item.tag == 'sd') definition = `<div class="dis"><span class="eng_dis">${item.enText}</span></div>` + definition;
                                    let defs = [];
                                    if (item.tag == 'n-g' || item.tag == 'id-g' || item.tag == 'pv-g') defs = item.data;
                                    if (item.tag == 'vrs' || item.tag == 'xrs') defs = item.data[0].data;
                                    definition += buildDefinitionBlock(expression, pos, defs);
                                }
                                definitions.push(definition);
                            }
                        }
                    }
                }
                let css = Oxford.renderCSS();
                notes.push({ css, expression, reading, definitions, audios });
                return notes;
            } catch (error) {
                return [];
            }

        }

    }

    static renderCSS() {
        let css = `
            <style>
                div.dis {font-weight: bold;margin-bottom:3px;padding:0;}
                span.eng_dis  {margin-right: 5px;}
                span.pos  {text-transform:lowercase; font-size:0.9em;padding: 0px 4px 3px 4px; color:white; border-radius:4px;background-color: #0d47a1}
                span.tran {margin:0; padding:0;}
                span.eng_tran {margin-right:3px; padding:0;}
                span.eng_sent {font-style:italic;color:#00f;list-style:square inside;}
            </style>`;
        return css;
    }
}
