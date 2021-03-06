// @flow

import type {TemplatePipeline, TemplatePipelineElement} from "../TemplatePipeline";
import type {TemplateRenderer} from "../TemplateRenderer";

const CODE_PATTERN = /{@code ([^}]*)}/g;

const LINK_PATTERN = /{@link ([^|\s}]*)([\s|])?([^}]*)}/g;

/**
 * Resolves the following types of tags:
 *
 * + {@link [<URL> | <DocPath>]} - replaces it with a link-element to the URL or document
 * + TODO: {@code [<CODE>]}
 */
export class TemplateTagsResolver implements TemplatePipelineElement<{}> {
  linkClass: ?string;
  renderer: TemplateRenderer;

  /**
   * @param {object} options
   * @param {string}[options.linkClass] - CSS class for the link elements generated
   */
  constructor(options?: { linkClass?: ?string } = {}) {
    this.linkClass = options.linkClass;
  }

  attachTo(pipeline: TemplatePipeline) {
    this.renderer = pipeline.renderer;
  }

  run(input: string, pipelineData: any): string {
    input = this.runCodeTag(input);
    input = this.runLinkTag(input);

    return input;
  }

  runCodeTag(input: string): string {
    const codePattern = CODE_PATTERN;

    let codeMatch = codePattern.exec(input);

    while (codeMatch) {
      const code = codeMatch[1];
      const startIndex = codeMatch.index;
      const endIndex = codeMatch.index + codeMatch[0].length;

      input = input.slice(0, startIndex) +
        `<code>${code}</code>` +
        input.slice(endIndex);

      codeMatch = codePattern.exec(input);
    }

    return input;
  }

  runLinkTag(input: string): string {
    const linkPattern = LINK_PATTERN;
    let linkMatch = linkPattern.exec(input);

    while (linkMatch) {
      const linkTextMatch = matchTextPrefix(input, linkMatch.index);
      const link = linkMatch[1];
      const linkName = linkMatch[3];
      const linkText = linkTextMatch ? linkTextMatch[0].slice(1, -1) : (linkName || link);

      let replaced;

      if (isValidUrl(link)) {
        replaced = `<a ${this.linkClass ? "class=\"" + this.linkClass + "\"" : ""}` +
        `href="${link}">${linkText}</a>`;
      } else {
        replaced = this.renderer.linkTo(link, linkText);
      }

      const startIndex = linkTextMatch ? linkTextMatch.index : linkMatch.index;
      const endIndex = linkMatch.index + linkMatch[0].length;

      input =
        input.slice(0, startIndex) +
        replaced +
        input.slice(endIndex);

      linkMatch = linkPattern.exec(input);
    }

    return input;
  }

  clone() {
    return new TemplateTagsResolver({
      linkClass: this.linkClass,
    });
  }

  close() {}
}

// Helper function to check if link content is just a URL
function isValidUrl(string) {
  try {
    new URL(string);
  } catch (_) {
    return false;
  }

  return true;
}

// Match the [TEXT_PREFIX] before a {@inline-tag ...}
function matchTextPrefix(content: string, tagStart: number): ?([string] & {index: number}) {
  const index = tagStart - 1;

  if (content.charAt(index) !== "]") {
    return;
  }

  // Allow nested bracket closures in the TEXT_PREFIX, e.g. TEXT_PREFIX[] is valid
  // This is the no. of closing brackets we are in
  // _] = 1
  // _[]] = 1
  let bracketDepth = 1; // (1 because we include the "]" at "index")

  // Index at which last opening bracket is found
  let openIndex = -1;

  for (let i = index - 1; i >= 0; i--) {
    const char = content.charAt(i);

    if (char === "[") {
      --bracketDepth;

      if (bracketDepth === 0) {
        openIndex = i;
        break;
      }
    } else if (char === "]") {
      ++bracketDepth;
    }
  }

  if (openIndex === -1) {
    return;
  }

  const result = [content.slice(openIndex, index + 1)];

  // $FlowFixMe
  result.index = openIndex;
  // $FlowFixMe
  return result;
}
